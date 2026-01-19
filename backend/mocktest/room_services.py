"""
Room Services - Question Selection and Room Management Logic

This module contains business logic for:
- Question selection based on room configuration
- Question pool validation
- Randomization logic
"""
import random
from django.db.models import Q
from .models import Room, Question, RoomQuestion, RoomParticipant


def select_questions_for_room(room):
    """
    Select questions for a room based on its configuration.
    
    Args:
        room: Room instance
        
    Returns:
        tuple: (questions_queryset, available_count, requested_count)
    """
    # Base queryset: questions from the exam
    queryset = Question.objects.filter(
        exam=room.exam_id,
        mock_test__isnull=True  # Only standalone questions from question bank
    )
    
    # Filter by subjects if specific mode
    if room.subject_mode == Room.SubjectMode.SPECIFIC:
        if room.subjects:
            # subjects can be a list of subject names or topics
            queryset = queryset.filter(
                Q(subject__in=room.subjects) | Q(topic__in=room.subjects)
            )
    
    # Filter by difficulty
    if room.difficulty != Room.Difficulty.MIXED:
        difficulty_map = {
            Room.Difficulty.EASY: 'easy',
            Room.Difficulty.MEDIUM: 'medium',
            Room.Difficulty.HARD: 'hard',
        }
        difficulty_level = difficulty_map.get(room.difficulty)
        if difficulty_level:
            queryset = queryset.filter(difficulty_level__level=difficulty_level)
    
    # Filter by question types
    if room.question_types and len(room.question_types) > 0:
        queryset = queryset.filter(question_type__in=room.question_types)
    elif room.question_type_mix == Room.QuestionTypeMix.MCQ:
        queryset = queryset.filter(question_type=Question.QuestionType.MCQ)
    elif room.question_type_mix == Room.QuestionTypeMix.INTEGER:
        queryset = queryset.filter(question_type=Question.QuestionType.INTEGER)
    elif room.question_type_mix == Room.QuestionTypeMix.NUMERICAL:
        queryset = queryset.filter(question_type=Question.QuestionType.NUMERICAL)
    # For MIXED, include all question types (no filter)
    
    # Ensure questions have required fields
    queryset = queryset.filter(
        correct_option__isnull=False,
        difficulty_level__isnull=False,
        subject__isnull=False
    ).exclude(correct_option='')
    
    available_count = queryset.count()
    requested_count = room.number_of_questions
    
    return queryset, available_count, requested_count


def validate_question_pool(room):
    """
    Validate if enough questions are available for the room.
    
    Args:
        room: Room instance
        
    Returns:
        dict: {
            'valid': bool,
            'available_count': int,
            'requested_count': int,
            'message': str
        }
    """
    queryset, available_count, requested_count = select_questions_for_room(room)
    
    if available_count >= requested_count:
        return {
            'valid': True,
            'available_count': available_count,
            'requested_count': requested_count,
            'message': f'Sufficient questions available ({available_count} >= {requested_count})'
        }
    else:
        return {
            'valid': False,
            'available_count': available_count,
            'requested_count': requested_count,
            'message': f'Only {available_count} questions available, but {requested_count} requested'
        }


def generate_room_questions(room, auto_adjust=False):
    """
    Generate and assign questions to a room.
    
    Args:
        room: Room instance
        auto_adjust: If True, adjust number_of_questions if insufficient questions available
        
    Returns:
        tuple: (success: bool, message: str, questions_created: int)
    """
    # Validate question pool
    validation = validate_question_pool(room)
    
    if not validation['valid']:
        if auto_adjust:
            # Adjust to available count
            room.number_of_questions = validation['available_count']
            room.save()
            requested_count = validation['available_count']
        else:
            return False, validation['message'], 0
    else:
        requested_count = validation['requested_count']
    
    # Get questions
    queryset, available_count, _ = select_questions_for_room(room)
    
    # Randomly select questions
    if available_count > requested_count:
        selected_questions = random.sample(list(queryset), requested_count)
    else:
        selected_questions = list(queryset)
    
    # Create RoomQuestion entries
    RoomQuestion.objects.filter(room=room).delete()  # Clear existing questions
    
    created_count = 0
    for idx, question in enumerate(selected_questions, start=1):
        RoomQuestion.objects.create(
            room=room,
            question=question,
            question_number=idx
        )
        created_count += 1
    
    return True, f'Successfully generated {created_count} questions', created_count


def randomize_questions_for_participant(participant):
    """
    Randomize question order and/or options for a participant based on room settings.
    
    Args:
        participant: RoomParticipant instance
        
    Returns:
        list: List of RoomQuestion instances in randomized order
    """
    room = participant.room
    questions = list(room.room_questions.all().order_by('question_number'))
    
    if room.randomization_mode == Room.RandomizationMode.NONE:
        return questions
    
    # Generate or use existing randomization seed
    if participant.randomization_seed is None:
        participant.randomization_seed = random.randint(1, 1000000)
        participant.save()
    
    # Use seed for consistent randomization
    random.seed(participant.randomization_seed)
    
    if room.randomization_mode in [
        Room.RandomizationMode.QUESTION_ORDER,
        Room.RandomizationMode.QUESTION_AND_OPTIONS
    ]:
        # Randomize question order
        questions = random.sample(questions, len(questions))
        # Reassign question numbers for this participant's view
        for idx, rq in enumerate(questions, start=1):
            rq._display_number = idx  # Temporary attribute for display
    
    random.seed()  # Reset seed
    
    return questions


def calculate_participant_score(participant):
    """
    Calculate total score for a participant.
    
    Args:
        participant: RoomParticipant instance
        
    Returns:
        dict: {
            'total_score': float,
            'total_marks': float,
            'percentage': float,
            'correct_count': int,
            'wrong_count': int,
            'unanswered_count': int
        }
    """
    attempts = participant.attempts.all()
    
    # Calculate total score from attempts (includes negative marks for wrong answers)
    total_score = sum(attempt.marks_obtained for attempt in attempts)
    
    # Calculate total marks from ALL questions in the room (not just attempted ones)
    # This ensures fair comparison across participants
    all_room_questions = participant.room.room_questions.all()
    total_marks = sum(rq.question.marks for rq in all_room_questions)
    
    correct_count = attempts.filter(is_correct=True).count()
    wrong_count = attempts.filter(is_correct=False).count()
    unanswered_count = participant.room.room_questions.count() - attempts.count()
    
    # Calculate percentage based on total marks of all questions
    percentage = (total_score / total_marks * 100) if total_marks > 0 else 0
    
    return {
        'total_score': total_score,
        'total_marks': total_marks,
        'percentage': round(percentage, 2),
        'correct_count': correct_count,
        'wrong_count': wrong_count,
        'unanswered_count': unanswered_count,
    }


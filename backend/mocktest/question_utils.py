"""
Utility functions for handling QuestionBank.

All questions are stored in QuestionBank and linked to tests via MockTestQuestion.
"""
from typing import Optional
from django.db.models import QuerySet
from .models import QuestionBank, MockTestQuestion


def get_questions_for_mock_test(mock_test) -> QuerySet:
    """
    Get questions for a mock test via MockTestQuestion.
    
    Args:
        mock_test: MockTest instance
        
    Returns:
        QuerySet of QuestionBank objects
    """
    # Get questions via MockTestQuestion
    test_questions = MockTestQuestion.objects.filter(
        mock_test=mock_test
    ).select_related('question').order_by('question_number')
    
    # Return QuestionBank objects via the junction table
    question_ids = test_questions.values_list('question_id', flat=True)
    return QuestionBank.objects.filter(id__in=question_ids).order_by(
        'test_assignments__question_number'
    )


def get_question_number_for_test(question: QuestionBank, mock_test) -> Optional[int]:
    """
    Get the question number for a question within a specific test.
    
    Args:
        question: QuestionBank instance
        mock_test: MockTest instance
        
    Returns:
        Question number or None if not found
    """
    mtq = MockTestQuestion.objects.filter(
        mock_test=mock_test,
        question=question
    ).first()
    if mtq:
        return mtq.question_number
    return None


def create_or_get_question_bank(
    text: str,
    exam_id: Optional[int] = None,
    year: Optional[int] = None,
    subject: str = '',
    **kwargs
) -> QuestionBank:
    """
    Create or get a QuestionBank entry based on question hash.
    This prevents duplicate questions in the bank.
    
    Args:
        text: Question text
        exam_id: Exam ID
        year: Year
        subject: Subject
        **kwargs: Additional fields for QuestionBank
        
    Returns:
        QuestionBank instance
    """
    import hashlib
    
    # Generate hash
    exam_id_str = str(exam_id) if exam_id else ''
    year_str = str(year) if year else ''
    hash_string = f"{text}{exam_id_str}{year_str}{subject}"
    question_hash = hashlib.sha256(hash_string.encode()).hexdigest()
    
    # Get or create
    question_bank, created = QuestionBank.objects.get_or_create(
        question_hash=question_hash,
        defaults={
            'text': text,
            'exam_id': exam_id,
            'year': year,
            'subject': subject,
            **kwargs
        }
    )
    
    return question_bank




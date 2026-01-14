"""
Predictor App Views

Production-ready views with proper error handling, validation, and performance optimizations.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.utils import timezone

from .models import Exam, College, Course, Cutoff, Prediction, ScoreToRank
from .serializers import (
    ExamSerializer,
    CollegeSerializer,
    CourseSerializer,
    CourseListSerializer,
    CutoffSerializer,
    CutoffListSerializer,
    PredictionSerializer,
    PredictionCreateSerializer,
    ScoreToRankSerializer,
)


class ExamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Exam model.
    Provides CRUD operations for exams.
    """
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        """Filter by is_active if requested."""
        queryset = Exam.objects.all()
        is_active = self.request.query_params.get('is_active', None)
        
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')


class CollegeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for College model.
    Provides CRUD operations for colleges.
    """
    queryset = College.objects.all()
    serializer_class = CollegeSerializer
    
    def get_queryset(self):
        """Filter by state, college_type, is_active if requested."""
        queryset = College.objects.all()
        
        state = self.request.query_params.get('state', None)
        college_type = self.request.query_params.get('college_type', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if state:
            queryset = queryset.filter(state__icontains=state)
        if college_type:
            queryset = queryset.filter(college_type=college_type)
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')
    
    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        """Get all courses for a college."""
        college = self.get_object()
        courses = college.courses.filter(is_active=True)
        serializer = CourseListSerializer(courses, many=True)
        return Response(serializer.data)


class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course model.
    Provides CRUD operations for courses.
    """
    queryset = Course.objects.select_related('college').all()
    serializer_class = CourseSerializer
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer
    
    def get_queryset(self):
        """Filter by college, degree, branch, is_active if requested."""
        queryset = Course.objects.select_related('college').all()
        
        college_id = self.request.query_params.get('college', None)
        degree = self.request.query_params.get('degree', None)
        branch = self.request.query_params.get('branch', None)
        is_active = self.request.query_params.get('is_active', None)
        
        if college_id:
            queryset = queryset.filter(college_id=college_id)
        if degree:
            queryset = queryset.filter(degree=degree)
        if branch:
            queryset = queryset.filter(branch=branch)
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('college', 'name')


class CutoffViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Cutoff model.
    Provides CRUD operations for cutoffs.
    """
    queryset = Cutoff.objects.select_related('exam', 'course', 'course__college').all()
    serializer_class = CutoffSerializer
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return CutoffListSerializer
        return CutoffSerializer
    
    def get_queryset(self):
        """Filter by exam, year, category, quota, state if requested."""
        queryset = Cutoff.objects.select_related('exam', 'course', 'course__college').all()
        
        exam_id = self.request.query_params.get('exam', None)
        year = self.request.query_params.get('year', None)
        category = self.request.query_params.get('category', None)
        quota = self.request.query_params.get('quota', None)
        state = self.request.query_params.get('state', None)
        rank = self.request.query_params.get('rank', None)  # Find cutoffs for a specific rank
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        if year:
            try:
                queryset = queryset.filter(year=int(year))
            except ValueError:
                pass
        if category:
            queryset = queryset.filter(category=category)
        if quota:
            queryset = queryset.filter(quota=quota)
        if state:
            queryset = queryset.filter(state=state)
        if rank:
            try:
                rank = int(rank)
                # Find cutoffs where rank falls within opening_rank and closing_rank
                queryset = queryset.filter(opening_rank__lte=rank, closing_rank__gte=rank)
            except ValueError:
                pass
        
        return queryset.order_by('-year', 'opening_rank')


class PredictionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Prediction model.
    Provides CRUD operations for predictions.
    """
    queryset = Prediction.objects.select_related('exam', 'user').all()
    serializer_class = PredictionSerializer
    
    def get_serializer_class(self):
        """Use create serializer for create action."""
        if self.action == 'create':
            return PredictionCreateSerializer
        return PredictionSerializer
    
    def get_queryset(self):
        """Filter by user, exam, category if requested."""
        queryset = Prediction.objects.select_related('exam', 'user').all()
        
        # If user is authenticated, show their predictions by default
        if self.request.user.is_authenticated:
            user_filter = self.request.query_params.get('user', None)
            if user_filter is None:
                queryset = queryset.filter(user=self.request.user)
            elif user_filter == 'all' and self.request.user.is_staff:
                pass  # Staff can see all
            else:
                try:
                    queryset = queryset.filter(user_id=int(user_filter))
                except (ValueError, TypeError):
                    pass
        else:
            # Anonymous users only see anonymous predictions
            queryset = queryset.filter(user__isnull=True)
        
        exam_id = self.request.query_params.get('exam', None)
        category = self.request.query_params.get('category', None)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('-timestamp')
    
    def perform_create(self, serializer):
        """Set user from request if authenticated."""
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class ScoreToRankViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ScoreToRank model.
    Provides CRUD operations for score-to-rank mappings.
    """
    queryset = ScoreToRank.objects.select_related('exam').all()
    serializer_class = ScoreToRankSerializer
    
    def get_queryset(self):
        """Filter by exam, year, category if requested."""
        queryset = ScoreToRank.objects.select_related('exam').all()
        
        exam_id = self.request.query_params.get('exam', None)
        year = self.request.query_params.get('year', None)
        category = self.request.query_params.get('category', None)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        if year:
            try:
                queryset = queryset.filter(year=int(year))
            except ValueError:
                pass
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('exam', '-year', 'category', 'rank_low')


@api_view(['POST'])
def predict_college(request):
    """
    Predict colleges based on rank, exam, category, and state.
    
    Request body:
    {
        "input_rank": 1000,
        "exam": 1,  # exam ID
        "category": "general",
        "state": "Andhra Pradesh",  # optional, defaults to "All"
        "branch_list": ["cse", "ece"]  # optional
    }
    """
    try:
        input_rank = request.data.get('input_rank')
        exam_id = request.data.get('exam')
        category = request.data.get('category')
        state = request.data.get('state')
        branch_list = request.data.get('branch_list', [])

        # Validate required fields
        if not all([input_rank is not None, exam_id is not None, category]):
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'Missing required fields: input_rank, exam, category'}
            )

        # Convert and validate input_rank
        try:
            input_rank = int(input_rank)
            if input_rank <= 0:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={'message': 'input_rank must be a positive integer'}
                )
        except (ValueError, TypeError):
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'input_rank must be a valid integer'}
            )

        # Convert and validate exam_id
        try:
            exam_id = int(exam_id)
        except (ValueError, TypeError):
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'exam must be a valid integer (exam ID)'}
            )

        # Get the exam object
        try:
            exam = Exam.objects.get(id=exam_id, is_active=True)
        except Exam.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={'message': f'Exam with id {exam_id} not found or inactive'}
            )

        # Validate category (must match model choices)
        valid_categories = [choice[0] for choice in Cutoff.CategoryType.choices]
        if category not in valid_categories:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': f'Invalid category. Valid categories: {valid_categories}'}
            )

        # Set default state if not provided
        if state is None or state == '':
            state = 'All'

        # Get cutoffs matching criteria
        cutoffs = Cutoff.objects.filter(
            exam=exam,
            category=category
        ).select_related('course', 'course__college')

        # Filter by state if provided
        if state != 'All':
            cutoffs = cutoffs.filter(state=state)

        # Filter by rank range
        cutoffs = cutoffs.filter(
            opening_rank__lte=input_rank,
            closing_rank__gte=input_rank
        )

        # Filter by branch_list if provided
        if branch_list:
            cutoffs = cutoffs.filter(course__branch__in=branch_list)

        # Build response data
        colleges = []
        found_branches = set()

        for cutoff in cutoffs:
            colleges.append({
                'college_id': cutoff.course.college.id,
                'college_name': cutoff.course.college.name,
                'college_location': cutoff.course.college.location,
                'college_state': cutoff.course.college.state,
                'college_type': cutoff.course.college.get_college_type_display(),
                'course_id': cutoff.course.id,
                'course_name': cutoff.course.name,
                'branch': cutoff.course.branch,
                'branch_display': cutoff.course.get_branch_display(),
                'degree': cutoff.course.degree,
                'degree_display': cutoff.course.get_degree_display(),
                'opening_rank': cutoff.opening_rank,
                'closing_rank': cutoff.closing_rank,
                'year': cutoff.year,
                'quota': cutoff.quota,
                'quota_display': cutoff.get_quota_display(),
                'seat_type': cutoff.seat_type,
                'seat_type_display': cutoff.get_seat_type_display(),
            })
            found_branches.add(cutoff.course.branch)

        # Prepare input snapshot for audit
        input_snapshot = {
            'input_rank': input_rank,
            'exam_id': exam_id,
            'exam_name': exam.name,
            'category': category,
            'state': state,
            'branch_list': branch_list if branch_list else [],
            'timestamp': timezone.now().isoformat(),
        }

        # Prepare predicted result
        predicted_result = {
            'colleges': colleges,
            'total_colleges': len(colleges),
            'input_rank': input_rank,
            'exam': exam.name,
            'category': category,
            'category_display': dict(Cutoff.CategoryType.choices).get(category, category),
            'state': state,
            'branch_list': list(found_branches),
            'requested_branches': branch_list if branch_list else [],
        }

        if len(colleges) == 0:
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={
                    'message': 'No colleges found for the given criteria',
                    'predicted_result': predicted_result
                }
            )

        # Save prediction (if user is authenticated, associate with user)
        try:
            prediction = Prediction.objects.create(
                user=request.user if request.user.is_authenticated else None,
                exam=exam,
                input_rank=input_rank,
                category=category,
                state=state,
                branch_list=list(found_branches),
                input_snapshot=input_snapshot,
                predicted_result=predicted_result
            )
            
            return Response(
                status=status.HTTP_200_OK,
                data={
                    'message': 'Colleges predicted successfully',
                    'prediction_id': prediction.id,
                    'predicted_result': predicted_result
                }
            )
        except Exception as e:
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={'message': f'Error saving prediction: {str(e)}'}
            )

    except Exception as e:
        import traceback
        return Response(
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data={
                'message': f'Internal server error: {str(e)}',
                'traceback': traceback.format_exc() if request.user.is_staff else None
            }
        )


@api_view(['POST'])
def get_rank_from_score(request):
    """
    Convert score or percentile to estimated rank.
    
    Request body:
    {
        "exam": 1,  # exam ID (or exam name for backward compatibility)
        "category": "general",
        "year": 2024,
        "score": 250,  # OR "percentile": 95.5 (provide exactly one)
    }
    """
    try:
        exam_input = request.data.get('exam')
        category = request.data.get('category')
        year = request.data.get('year')
        score = request.data.get('score')
        percentile = request.data.get('percentile')

        # Validate required fields
        if not exam_input or not category or year is None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'Missing required fields: exam, category, year'}
            )

        # Validate: exactly one of score/percentile
        if score is None and percentile is None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'Provide exactly one: score OR percentile'}
            )
        if score is not None and percentile is not None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'Provide only one: score OR percentile (not both)'}
            )

        # Parse year
        try:
            year = int(year)
            if year < 2000 or year > 2100:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={'message': 'Year must be between 2000 and 2100'}
                )
        except (ValueError, TypeError):
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'year must be a valid integer'}
            )

        # Validate category
        valid_categories = [choice[0] for choice in ScoreToRank.CategoryType.choices]
        if category not in valid_categories:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': f'Invalid category. Valid categories: {valid_categories}'}
            )

        # Get exam (support both ID and name for backward compatibility)
        try:
            if isinstance(exam_input, int) or (isinstance(exam_input, str) and exam_input.isdigit()):
                exam = Exam.objects.get(id=int(exam_input), is_active=True)
            else:
                exam = Exam.objects.get(name=exam_input, is_active=True)
        except Exam.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={'message': f'Exam not found or inactive'}
            )

        # Determine input type and value
        input_type = 'score' if score is not None else 'percentile'
        try:
            input_value = float(score) if score is not None else float(percentile)
            if input_value < 0:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={'message': 'score/percentile must be non-negative'}
                )
            if input_type == 'percentile' and input_value > 100:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={'message': 'percentile must be between 0 and 100'}
                )
        except (ValueError, TypeError):
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={'message': 'score/percentile must be valid numbers'}
            )

        # Try to find data for requested year, with fallback to previous year
        actual_year = year
        fallback_used = False

        # Base query
        base_qs = ScoreToRank.objects.filter(
            exam=exam,
            category=category,
            year=year
        )

        # Filter by score or percentile range
        if input_type == 'score':
            qs = base_qs.filter(
                score_low__lte=input_value,
                score_high__gte=input_value
            )
        else:
            qs = base_qs.filter(
                percentile_low__lte=input_value,
                percentile_high__gte=input_value
            )

        # Fallback to previous year if no data found
        if not qs.exists() and year > 2024:
            fallback_year = year - 1
            base_qs_fallback = ScoreToRank.objects.filter(
                exam=exam,
                category=category,
                year=fallback_year
            )

            if input_type == 'score':
                qs = base_qs_fallback.filter(
                    score_low__lte=input_value,
                    score_high__gte=input_value
                )
            else:
                qs = base_qs_fallback.filter(
                    percentile_low__lte=input_value,
                    percentile_high__gte=input_value
                )

            if qs.exists():
                actual_year = fallback_year
                fallback_used = True

        if not qs.exists():
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={
                    'message': f'No rank mapping found for the given criteria. Currently, we have data for 2025 only. We are working on adding more years.'
                }
            )

        # Weighted interpolation settings
        K = 5  # Number of bands to use
        p = 2  # Weight power (strong preference to closer bands)
        eps = 1e-9

        # Compute midpoint-distance for each band, pick nearest K
        bands_with_dist = []
        for band in qs:
            if input_type == 'score':
                mid_input = ((band.score_low or 0) + (band.score_high or 0)) / 2
            else:
                mid_input = ((band.percentile_low or 0.0) + (band.percentile_high or 0.0)) / 2

            dist = abs(input_value - mid_input)
            bands_with_dist.append((dist, band))

        # Sort by distance and take nearest K
        bands_with_dist.sort(key=lambda x: x[0])
        selected = [b for _, b in bands_with_dist[:K]]

        # Weighted rank prediction using Inverse Distance Weighting (IDW)
        weighted_sum = 0.0
        weight_total = 0.0
        min_rank_low = None
        max_rank_high = None

        for band in selected:
            mid_rank = (band.rank_low + band.rank_high) / 2

            if input_type == 'score':
                mid_input = ((band.score_low or 0) + (band.score_high or 0)) / 2
            else:
                mid_input = ((band.percentile_low or 0.0) + (band.percentile_high or 0.0)) / 2

            dist = abs(input_value - mid_input)
            w = 1.0 / ((dist ** p) + eps)

            weighted_sum += mid_rank * w
            weight_total += w

            min_rank_low = band.rank_low if min_rank_low is None else min(min_rank_low, band.rank_low)
            max_rank_high = band.rank_high if max_rank_high is None else max(max_rank_high, band.rank_high)

        # Fallback safety
        if weight_total <= 0:
            fallback = selected[0]
            predicted_rank = int((fallback.rank_low + fallback.rank_high) / 2)
        else:
            predicted_rank = int(weighted_sum / weight_total)

        # Clamp prediction into min/max range of selected bands
        predicted_rank = max(min_rank_low, min(max_rank_high, predicted_rank))

        response_data = {
            'exam': exam.name,
            'exam_id': exam.id,
            'year': actual_year,
            'requested_year': year,
            'category': category,
            'category_display': dict(ScoreToRank.CategoryType.choices).get(category, category),
            'input_type': input_type,
            'input_value': input_value,
            'rank_low': min_rank_low,
            'rank_high': max_rank_high,
            'estimated_rank': predicted_rank,
            'bands_used': len(selected),
            'weighting': {'method': 'IDW', 'p': p, 'K': K}
        }

        if fallback_used:
            response_data['fallback_message'] = f'Data for {year} not available. Showing results based on {actual_year} data.'

        return Response(
            status=status.HTTP_200_OK,
            data={
                'message': 'Rank found successfully',
                'data': response_data
            }
        )

    except (ValueError, TypeError) as e:
        return Response(
            status=status.HTTP_400_BAD_REQUEST,
            data={'message': f'Invalid data types: {str(e)}'}
        )
    except Exception as e:
        import traceback
        return Response(
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data={
                'message': f'Internal server error: {str(e)}',
                'traceback': traceback.format_exc() if request.user.is_staff else None
            }
        )


@api_view(['GET'])
def get_categories(request):
    """
    Get available categories for rank prediction or college prediction.
    Returns list of valid category choices.
    
    Query params:
    - type: 'rank' (default) or 'college' - determines which model's categories to return
    - exam_id: (optional) exam ID - if provided, returns only categories that exist for that exam
    """
    try:
        category_type = request.query_params.get('type', 'rank').lower()
        exam_id = request.query_params.get('exam_id')
        
        # If exam_id is provided without type, assume it's for college prediction
        if exam_id and category_type == 'rank':
            category_type = 'college'
        
        if category_type == 'college':
            # Use Cutoff categories for college prediction
            if exam_id:
                # Get only categories that exist for this specific exam
                try:
                    exam = Exam.objects.get(id=exam_id, is_active=True)
                    # Get distinct categories from Cutoff records for this exam
                    # Using distinct() on values_list to ensure no duplicates
                    existing_categories = list(
                        Cutoff.objects.filter(exam=exam)
                        .values_list('category', flat=True)
                        .distinct()
                        .order_by('category')
                    )
                    
                    # Convert to set first to remove any duplicates, then back to sorted list
                    existing_categories = sorted(list(set(existing_categories)))
                    
                    # Filter to only valid choices from model
                    valid_category_choices = [choice[0] for choice in Cutoff.CategoryType.choices]
                    category_choices = [
                        cat for cat in existing_categories 
                        if cat in valid_category_choices
                    ]
                    
                    # Build display mapping for existing categories
                    category_display = {
                        choice[0]: choice[1] 
                        for choice in Cutoff.CategoryType.choices 
                        if choice[0] in category_choices
                    }
                except Exam.DoesNotExist:
                    return Response(
                        status=status.HTTP_404_NOT_FOUND,
                        data={'message': f'Exam with id {exam_id} not found or inactive'}
                    )
            else:
                # No exam_id provided, return all possible categories
                category_choices = [choice[0] for choice in Cutoff.CategoryType.choices]
                category_display = {choice[0]: choice[1] for choice in Cutoff.CategoryType.choices}
        else:
            # Use ScoreToRank categories for rank prediction (matches get_rank_from_score)
            category_choices = [choice[0] for choice in ScoreToRank.CategoryType.choices]
            category_display = {choice[0]: choice[1] for choice in ScoreToRank.CategoryType.choices}
        
        return Response(
            status=status.HTTP_200_OK,
            data={
                'categories': category_choices,
                'category_display': category_display,
                'type': category_type,
                'exam_id': int(exam_id) if exam_id else None
            }
        )
    except ValueError as e:
        return Response(
            status=status.HTTP_400_BAD_REQUEST,
            data={'message': f'Invalid exam_id: {str(e)}'}
        )
    except Exception as e:
        return Response(
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data={'message': f'Error fetching categories: {str(e)}'}
        )

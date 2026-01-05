from django.shortcuts import render

from .serializers import ExamSerializer, CollegeSerializer, CourseSerializer, CutoffSerializer, PredictionSerializer, ScoreToRankSerializer

from .models import ExamModel, CollegeModel, CourseModel, CutoffModel, Prediction, ScoreToRankModel

from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.decorators import api_view

class ExamViewSet(ModelViewSet):
    queryset = ExamModel.objects.all()
    serializer_class = ExamSerializer
    class Meta:
        model = ExamModel
        fields = '__all__'



class CollegeViewSet(ModelViewSet):
    queryset = CollegeModel.objects.all()
    serializer_class = CollegeSerializer
    class Meta:
        model = CollegeModel
        fields = '__all__'


class CourseViewSet(ModelViewSet):
    queryset = CourseModel.objects.all()
    serializer_class = CourseSerializer
    class Meta:
        model = CourseModel
        fields = '__all__'


class CutoffViewSet(ModelViewSet):
    queryset = CutoffModel.objects.all()
    serializer_class = CutoffSerializer
    class Meta:
        model = CutoffModel
        fields = '__all__'


class PredictionViewSet(ModelViewSet):
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
    class Meta:
        model = Prediction
        fields = '__all__'


@api_view(['POST'])
def predict_college(request):
    try:
        input_rank = request.data.get('input_rank')
        exam = request.data.get('exam')
        category = request.data.get('category')
        state = request.data.get('state')

        if not all([input_rank is not None, exam is not None, category]):
            return Response(
                status=400, 
                data={'message': 'Missing required fields: input_rank, exam, category'}
            )

        # Convert input_rank to integer and exam to integer (ID)
        try:
            input_rank = int(input_rank)
            exam_id = int(exam)
        except (ValueError, TypeError) as e:
            return Response(
                status=400,
                data={'message': f'input_rank and exam must be valid integers: {str(e)}'}
            )

        # If state is not provided, set to 'All' to search across all states
        if state is None or state == '':
            state = 'All'

        # Get the exam object by ID
        try:
            exam = ExamModel.objects.get(id=exam_id)
        except ExamModel.DoesNotExist:
            return Response(status=404, data={'message': f'Exam with id {exam_id} not found'})
        except Exception as e:
            return Response(status=400, data={'message': f'Error fetching exam: {str(e)}'})

        # Get colleges based on rank from CutoffModel
        colleges = []
        branch_list = set()
       
        cutoffs = CutoffModel.objects.filter(
            exam=exam,
            category=category
        )
        
        # If state is provided and not 'All', filter by state
        if state != 'All':
            cutoffs = cutoffs.filter(state=state)
        
        cutoffs = cutoffs.select_related('course', 'course__college')
        
        for cutoff in cutoffs:
            if cutoff.opening_rank <= input_rank <= cutoff.closing_rank:
                colleges.append({
                    'college_name': cutoff.course.college.name,
                    'course_name': cutoff.course.name,
                    'branch': cutoff.course.branch,
                    'degree': cutoff.course.degree,
                    'location': cutoff.course.college.location
                })
                branch_list.add(cutoff.course.branch)

        # Prepare response
        predicted_result = {
            'colleges': colleges,
            'input_rank': input_rank,
            'exam': exam.name,
            'category': category,
            'state': state,
            'branch_list': list(branch_list)
        }

        if len(colleges) == 0:
            return Response(status=404, data={'message': 'No colleges found for the given criteria'})
        else:
            try:
                Prediction.objects.create(
                    input_rank=input_rank,
                    exam=exam,
                    category=category,
                    state=state,
                    branch_list=list(branch_list),
                    predicted_result=predicted_result
                )
                return Response(
                    status=200,
                    data={'message': 'Colleges predicted successfully', 'predicted_result': predicted_result}
                )
            except Exception as e:
                return Response(
                    status=500,
                    data={'message': f'Error saving prediction: {str(e)}'}
                )
    except Exception as e:
        import traceback
        return Response(
            status=500,
            data={'message': f'Internal server error: {str(e)}', 'traceback': traceback.format_exc()}
        )

    


class ScoreToRankViewSet(ModelViewSet):
    queryset = ScoreToRankModel.objects.all()
    serializer_class = ScoreToRankSerializer
    class Meta:
        model = ScoreToRankModel
        fields = '__all__'


from rest_framework import status

@api_view(["POST"])
def get_rank_from_score(request):
    try:
        exam_name = request.data.get("exam")
        category = request.data.get("category")
        year = request.data.get("year")
        score = request.data.get("score")
        percentile = request.data.get("percentile")

        # 1) Required fields
        if not exam_name or not category or year is None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={"message": "Missing required fields: exam, category, year"}
            )

        # 2) Validate: exactly one of score/percentile
        if score is None and percentile is None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={"message": "Provide exactly one: score OR percentile"}
            )
        if score is not None and percentile is not None:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={"message": "Provide only one: score OR percentile (not both)"}
            )

        # 3) Parse
        year = int(year)
        category = category.capitalize()  # must match DB choices ('General','OBC','SC','ST')

        # 4) Exam lookup
        try:
            exam = ExamModel.objects.get(name=exam_name)
        except ExamModel.DoesNotExist:
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={"message": f"Exam '{exam_name}' not found"}
            )

        # 5) Decide input type and get candidate bands with year fallback
        input_type = "score" if score is not None else "percentile"
        input_value = float(score) if score is not None else float(percentile)

        # Try to find data for the requested year, with fallback to previous year
        actual_year = year
        fallback_used = False
        
        # Check if data exists for requested year
        base_qs = ScoreToRankModel.objects.filter(exam=exam, category=category, year=year)
        
        if input_type == "score":
            qs = base_qs.filter(score_low__lte=input_value, score_high__gte=input_value)
        else:
            qs = base_qs.filter(percentile_low__lte=input_value, percentile_high__gte=input_value)

        # If no data found for requested year, try previous year
        if not qs.exists() and year > 2024:
            fallback_year = year - 1
            
            base_qs_fallback = ScoreToRankModel.objects.filter(exam=exam, category=category, year=fallback_year)
            
            if input_type == "score":
                qs = base_qs_fallback.filter(score_low__lte=input_value, score_high__gte=input_value)
            else:
                qs = base_qs_fallback.filter(percentile_low__lte=input_value, percentile_high__gte=input_value)
            
            if qs.exists():
                actual_year = fallback_year
                fallback_used = True

        if not qs.exists():
            return Response(
                status=status.HTTP_404_NOT_FOUND,
                data={
                    "message": f"No rank mapping found for the given criteria. Currently, we have data for 2025 only. We are working on adding more years."
                }
            )

        # -----------------------------
        # Weighted Across Bands Settings
        # -----------------------------
        # K = how many bands to use (nearest K by midpoint distance)
        # p = weight power (2 means strong preference to closer bands)
        K = 5
        p = 2
        eps = 1e-9

        # 6) Compute midpoint-distance for each band, then pick nearest K
        bands_with_dist = []
        for band in qs:
            if input_type == "score":
                mid_input = ((band.score_low or 0) + (band.score_high or 0)) / 2
            else:
                mid_input = ((band.percentile_low or 0.0) + (band.percentile_high or 0.0)) / 2

            dist = abs(input_value - mid_input)
            bands_with_dist.append((dist, band))

        # sort by distance and take nearest K
        bands_with_dist.sort(key=lambda x: x[0])
        selected = [b for _, b in bands_with_dist[:K]]

        # 7) Weighted rank prediction using IDW
        weighted_sum = 0.0
        weight_total = 0.0

        min_rank_low = None
        max_rank_high = None

        for band in selected:
            mid_rank = (band.rank_low + band.rank_high) / 2

            if input_type == "score":
                mid_input = ((band.score_low or 0) + (band.score_high or 0)) / 2
            else:
                mid_input = ((band.percentile_low or 0.0) + (band.percentile_high or 0.0)) / 2

            dist = abs(input_value - mid_input)
            w = 1.0 / ((dist ** p) + eps)

            weighted_sum += mid_rank * w
            weight_total += w

            min_rank_low = band.rank_low if min_rank_low is None else min(min_rank_low, band.rank_low)
            max_rank_high = band.rank_high if max_rank_high is None else max(max_rank_high, band.rank_high)

        # fallback safety
        if weight_total <= 0:
            # pick any band (first) and return midpoint
            fallback = selected[0]
            predicted_rank = int((fallback.rank_low + fallback.rank_high) / 2)
        else:
            predicted_rank = int(weighted_sum / weight_total)

        # 8) Clamp prediction into min/max range of selected bands
        predicted_rank = max(min_rank_low, min(max_rank_high, predicted_rank))

        response_data = {
            "exam": exam.name,
            "year": actual_year,
            "requested_year": year,
            "category": category,
            "input_type": input_type,
            "input_value": input_value,
            "rank_low": min_rank_low,
            "rank_high": max_rank_high,
            "estimated_rank": predicted_rank,
            "bands_used": len(selected),
            "weighting": {"method": "IDW", "p": p, "K": K}
        }
        
        if fallback_used:
            response_data["fallback_message"] = f"Data for {year} not available. Showing results based on {actual_year} data."
        
        return Response(
            status=status.HTTP_200_OK,
            data={
                "message": "Rank found successfully",
                "data": response_data
            }
        )

    except (ValueError, TypeError):
        return Response(
            status=status.HTTP_400_BAD_REQUEST,
            data={"message": "Invalid data types. year must be int; score/percentile must be numeric."}
        )
    except Exception as e:
        return Response(
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data={"message": f"Internal server error: {str(e)}"}
        )


@api_view(['GET'])
def get_categories(request):
    # Get categories from model choices to ensure consistency
    category_choices = [choice[0] for choice in CutoffModel._meta.get_field('category').choices]
    return Response(status=status.HTTP_200_OK, data={'categories': category_choices})
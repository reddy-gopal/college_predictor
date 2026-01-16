from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .utils import verify_google_token
from .models import CustomUser
from mocktest.models import StudentProfile
from rest_framework.decorators import api_view

@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Google OAuth login endpoint.
    Verifies Google ID token and creates/updates user.
    Returns JWT tokens and user data.
    """
    try:
        token = request.data.get('token')

        if not token:
            return Response({
                'detail': 'Token Required'
            }, status=status.HTTP_400_BAD_REQUEST)

        idinfo = verify_google_token(token)
        if not idinfo:
            return Response({
                'detail': 'Invalid or expired token'
            }, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email')
        google_id = idinfo.get('sub')
        name = idinfo.get('name', '')
        picture = idinfo.get('picture')

        if not email or not google_id:
            return Response({
                'detail': 'Invalid token: missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Split name into first_name and last_name
        name_parts = name.split(' ', 1) if name else ['', '']
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Try to get user by email or google_id
        user = None
        created = False
        
        # First, try to find by google_id
        if google_id:
            try:
                user = CustomUser.objects.get(google_id=google_id)
            except CustomUser.DoesNotExist:
                pass
        
        # If not found, try by email
        if not user and email:
            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                pass
        
        # Create new user if not found
        if not user:
            user = CustomUser.objects.create(
                email=email,
                google_id=google_id,
                google_email=email,
                first_name=first_name,
                last_name=last_name,
                google_picture=picture,
                is_google_user=True,
                is_active=True,
            )
            created = True
        else:
            # Update existing user with Google info
            user.google_id = google_id
            user.google_email = email
            user.is_google_user = True
            if first_name and not user.first_name:
                user.first_name = first_name
            if last_name and not user.last_name:
                user.last_name = last_name
            if picture:
                user.google_picture = picture
            user.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get or create StudentProfile for new users
        student_profile = None
        if created:
            # Create StudentProfile for new Google users
            try:
                student_profile = StudentProfile.objects.create(
                    user=user,
                    class_level=StudentProfile.ClassLevel.CLASS_12,  # Default
                    exam_target=StudentProfile.ExamTarget.JEE_MAIN,  # Default
                )
            except Exception as e:
                print(f"Error creating StudentProfile: {e}")
        else:
            # Try to get existing StudentProfile
            try:
                student_profile = user.student_profile
            except StudentProfile.DoesNotExist:
                pass
        
        # Get full name from first_name and last_name
        full_name = f"{user.first_name} {user.last_name}".strip() or user.email
        
        # Build user response data
        user_data = {
            'id': user.id,
            'email': user.email,
            'full_name': full_name,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'google_picture': user.google_picture,
            'is_google_user': user.is_google_user,
            'preferred_branches': user.preferred_branches,
            'is_phone_verified': user.is_phone_verified,
        }
        
        # Add StudentProfile data if it exists
        if student_profile:
            user_data['class_level'] = student_profile.class_level
            user_data['exam_target'] = student_profile.exam_target
            user_data['target_rank'] = student_profile.target_rank
            user_data['tests_per_week'] = student_profile.tests_per_week
            user_data['onboarding_completed'] = student_profile.onboarding_completed
            user_data['total_xp'] = student_profile.total_xp
        else:
            # Fallback to CustomUser fields
            user_data['class_level'] = user.class_level
            user_data['exam_target'] = user.exam_target
            user_data['target_rank'] = None
            user_data['tests_per_week'] = None
            user_data['onboarding_completed'] = False
            user_data['total_xp'] = 0
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_data,
            'is_new_user': created,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'detail': f'Login failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update user profile details (Phone, Class, Exam Target, Branches).
    Also updates or creates StudentProfile.
    """
    user = request.user
    data = request.data

    # Update CustomUser fields
    if 'phone' in data:
        new_phone = data.get('phone')
        # Only update if phone is different and not already taken by another user
        if new_phone and new_phone != user.phone:
            # Check if phone is already taken by another user
            if CustomUser.objects.filter(phone=new_phone).exclude(id=user.id).exists():
                return Response({
                    'detail': 'This phone number is already registered to another account.'
                }, status=status.HTTP_400_BAD_REQUEST)
            user.phone = new_phone
    
    if 'first_name' in data:
        user.first_name = data.get('first_name', '')
    
    if 'last_name' in data:
        user.last_name = data.get('last_name', '')
    
    if 'preferred_branches' in data:
        user.preferred_branches = data.get('preferred_branches')
    
    try:
        user.save()
    except Exception as e:
        return Response({
            'detail': f'Failed to update profile: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update or create StudentProfile
    class_level = data.get('class_level')
    exam_target = data.get('exam_target')
    target_rank = data.get('target_rank')
    tests_per_week = data.get('tests_per_week')
    student_profile = None
    
    # Check if StudentProfile exists
    try:
        student_profile = user.student_profile
    except StudentProfile.DoesNotExist:
        student_profile = None
    
    # Determine if we need to create/update StudentProfile
    has_profile_data = class_level or exam_target or target_rank or tests_per_week
    
    if has_profile_data:
        if student_profile:
            # Update existing profile
            if class_level:
                student_profile.class_level = class_level
            if exam_target:
                student_profile.exam_target = exam_target
            if target_rank is not None:
                student_profile.target_rank = int(target_rank) if target_rank else None
            if tests_per_week:
                student_profile.tests_per_week = tests_per_week
            # Mark onboarding as completed if we have required fields
            if class_level and exam_target:
                student_profile.onboarding_completed = True
            student_profile.save()
        else:
            # Create new profile - class_level and exam_target are required
            student_profile = StudentProfile.objects.create(
                user=user,
                class_level=class_level or StudentProfile.ClassLevel.CLASS_12,
                exam_target=exam_target or StudentProfile.ExamTarget.JEE_MAIN,
                target_rank=int(target_rank) if target_rank else None,
                tests_per_week=tests_per_week or None,
                onboarding_completed=bool(class_level and exam_target),
            )

    # Get full name from first_name and last_name (recalculate after update)
    full_name = f"{user.first_name} {user.last_name}".strip() or user.email
    
    # Build response with StudentProfile data if it exists
    response_data = {
        'message': 'Profile updated successfully',
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': full_name,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'google_picture': user.google_picture,
            'preferred_branches': user.preferred_branches,
            'is_google_user': user.is_google_user,
            'is_phone_verified': user.is_phone_verified,
        }
    }
    
    # Add StudentProfile data if it exists
    if student_profile:
        response_data['user']['class_level'] = student_profile.class_level
        response_data['user']['exam_target'] = student_profile.exam_target
        response_data['user']['target_rank'] = student_profile.target_rank
        response_data['user']['tests_per_week'] = student_profile.tests_per_week
        response_data['user']['onboarding_completed'] = student_profile.onboarding_completed
        response_data['user']['total_xp'] = student_profile.total_xp
    else:
        # Fallback to CustomUser fields if StudentProfile doesn't exist
        response_data['user']['class_level'] = user.class_level
        response_data['user']['exam_target'] = user.exam_target
        response_data['user']['target_rank'] = None
        response_data['user']['tests_per_week'] = None
        response_data['user']['onboarding_completed'] = False
        response_data['user']['total_xp'] = 0
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current authenticated user with StudentProfile data.
    Returns real-time data from database.
    """
    user = request.user
    
    # Get full name from first_name and last_name
    full_name = f"{user.first_name} {user.last_name}".strip() or user.email
    
    # Build user response data
    user_data = {
        'id': user.id,
        'email': user.email,
        'full_name': full_name,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': user.phone,
        'google_picture': user.google_picture,
        'is_google_user': user.is_google_user,
        'preferred_branches': user.preferred_branches,
        'is_phone_verified': user.is_phone_verified,
    }
    
    # Get StudentProfile data if it exists
    try:
        student_profile = user.student_profile
        user_data['class_level'] = student_profile.class_level
        user_data['exam_target'] = student_profile.exam_target
        user_data['target_rank'] = student_profile.target_rank
        user_data['tests_per_week'] = student_profile.tests_per_week
        user_data['onboarding_completed'] = student_profile.onboarding_completed
        user_data['total_xp'] = student_profile.total_xp
    except StudentProfile.DoesNotExist:
        # Fallback to CustomUser fields
        user_data['class_level'] = user.class_level
        user_data['exam_target'] = user.exam_target
        user_data['target_rank'] = None
        user_data['tests_per_week'] = None
        user_data['onboarding_completed'] = False
        user_data['total_xp'] = 0
    
    return Response({
        'user': user_data
    }, status=status.HTTP_200_OK)



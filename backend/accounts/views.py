from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .utils import verify_google_token
from .models import CustomUser, Referral, RewardHistory, Notification
from .referral_utils import activate_referral, award_first_login_bonus, calculate_referral_rewards, generate_unique_referral_code
from mocktest.models import StudentProfile
from rest_framework.decorators import api_view
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notification

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
        
        # Get referral code from request if present
        referral_code = request.data.get('referralCode', '').strip().upper()
        
        # Create new user if not found
        if not user:
            # Validate referral code if provided
            referrer = None
            if referral_code:
                try:
                    referrer = CustomUser.objects.get(referral_code=referral_code)
                    # Prevent self-referral (though unlikely for new users)
                    if referrer.email == email:
                        referral_code = None
                        referrer = None
                except CustomUser.DoesNotExist:
                    referral_code = None
            
            user = CustomUser.objects.create(
                email=email,
                google_id=google_id,
                google_email=email,
                first_name=first_name,
                last_name=last_name,
                google_picture=picture,
                is_google_user=True,
                is_active=True,
                referred_by=referral_code if referral_code else None,
            )
            created = True
            
            # Create pending referral if referral code was used
            if referral_code and referrer:
                Referral.objects.create(
                    referrer=referrer,
                    referral_code_used=referral_code,
                    status=Referral.Status.PENDING
                )
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
        
        # Award first login bonus if not already awarded
        first_login_bonus_awarded = False
        if not user.first_login_rewarded:
            bonus_result = award_first_login_bonus(user)
            if bonus_result['success']:
                first_login_bonus_awarded = True
                # Refresh user from DB to get updated credits
                user.refresh_from_db()
                
                # Activate referral if user was referred and this is their first login
                referral_activated = False
                if user.referred_by:
                    activation_result = activate_referral(user)
                    if activation_result['success']:
                        referral_activated = True
                        # Refresh user from DB to get updated credits
                        user.refresh_from_db()
                else:
                    referral_activated = False
        else:
            referral_activated = False
        
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
        
        # Add referral and credit information
        user_data['referral_code'] = user.referral_code
        user_data['room_credits'] = user.room_credits
        user_data['total_referrals'] = user.total_referrals
        
        response_data = {
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_data,
            'is_new_user': created,
        }
        
        # Add bonus information if awarded
        if first_login_bonus_awarded:
            response_data['first_login_bonus'] = {
                'awarded': True,
                'credits': 2,
                'total_credits': user.room_credits
            }
        
        if referral_activated:
            response_data['referral_activated'] = True
        
        return Response(response_data, status=status.HTTP_200_OK)

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
    
    # Add referral and credit information
    user_data['referral_code'] = user.referral_code
    user_data['room_credits'] = user.room_credits
    user_data['total_referrals'] = user.total_referrals
    
    return Response({
        'user': user_data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_referral_endpoint(request):
    """
    Manually activate a referral (usually called after referred user logs in).
    This endpoint can be used for non-Google signups.
    """
    try:
        referred_user_id = request.data.get('referredUserId')
        
        if not referred_user_id:
            return Response({
                'detail': 'referredUserId is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            referred_user = CustomUser.objects.get(id=referred_user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'detail': 'Referred user not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Only the referred user can activate their own referral
        if referred_user.id != request.user.id:
            return Response({
                'detail': 'You can only activate your own referral'
            }, status=status.HTTP_403_FORBIDDEN)
        
        result = activate_referral(referred_user)
        
        if result['success']:
            return Response({
                'message': result['message'],
                'credits_awarded': result['credits_awarded'],
                'total_referrals': result['total_referrals'],
                'referrer_credits': result['referrer'].room_credits
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'detail': f'Failed to activate referral: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_referral_code(request):
    """
    Process a referral code for an existing user.
    This is used when a user enters a referral code after registration.
    """
    try:
        referral_code = request.data.get('referral_code', '').strip().upper()
        
        if not referral_code:
            return Response({
                'detail': 'Referral code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        
        # Check if user already has a referral
        if user.referred_by:
            return Response({
                'detail': 'You have already used a referral code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the referrer
        try:
            referrer = CustomUser.objects.get(referral_code=referral_code)
        except CustomUser.DoesNotExist:
            return Response({
                'detail': 'Invalid referral code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent self-referral
        if referrer.id == user.id:
            return Response({
                'detail': 'You cannot use your own referral code'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if referral already exists
        existing_referral = Referral.objects.filter(
            referrer=referrer,
            referred=user
        ).first()
        
        if existing_referral:
            return Response({
                'detail': 'Referral already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user's referred_by field
        user.referred_by = referral_code
        user.save(update_fields=['referred_by'])
        
        # Create pending referral
        referral = Referral.objects.create(
            referrer=referrer,
            referred=user,
            referral_code_used=referral_code,
            status=Referral.Status.PENDING
        )
        
        # Activate the referral (since user has already logged in)
        result = activate_referral(user)
        
        if result['success']:
            return Response({
                'message': 'Referral code processed successfully',
                'credits_awarded': result.get('credits_awarded', 0),
                'referrer_credits': result['referrer'].room_credits
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'detail': f'Failed to process referral code: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    Send OTP to phone number (hardcoded to 0000 for now).
    """
    try:
        phone = request.data.get('phone', '').strip()
        
        if not phone:
            return Response({
                'detail': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, just return success (OTP is hardcoded to 0000)
        return Response({
            'message': 'OTP sent successfully',
            'otp': '0000'  # Hardcoded for development
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'detail': f'Failed to send OTP: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP for phone number (hardcoded to 0000 for now).
    """
    try:
        phone = request.data.get('phone', '').strip()
        otp = request.data.get('otp', '').strip()
        
        if not phone:
            return Response({
                'detail': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not otp:
            return Response({
                'detail': 'OTP is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Hardcoded OTP verification (0000)
        if otp == '0000':
            # Update user's phone verification status if user exists
            try:
                user = CustomUser.objects.get(phone=phone)
                user.is_phone_verified = True
                user.save(update_fields=['is_phone_verified'])
                
                # If user was referred and phone is now verified, activate referral
                if user.referred_by:
                    activate_referral(user)
            except CustomUser.DoesNotExist:
                # User doesn't exist yet (will be created during registration)
                pass
            
            return Response({
                'message': 'Phone number verified successfully',
                'verified': True
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'Invalid OTP. Please try again.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'detail': f'Failed to verify OTP: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_referral_stats(request):
    """
    Get referral statistics for the current user.
    """
    user = request.user
    
    # Get active referrals
    active_referrals = Referral.objects.filter(
        referrer=user,
        status=Referral.Status.ACTIVE
    ).select_related('referred')
    
    # Get pending referrals
    pending_referrals = Referral.objects.filter(
        referrer=user,
        status=Referral.Status.PENDING
    )
    
    # Get reward history
    reward_history = RewardHistory.objects.filter(
        user=user
    ).order_by('-created_at')[:20]  # Last 20 rewards
    
    # Calculate current referrals (use actual count from database for accuracy)
    current_refs = active_referrals.count()
    # Update user.total_referrals if it's out of sync
    if user.total_referrals != current_refs:
        user.total_referrals = current_refs
        user.save(update_fields=['total_referrals'])
    current_rewards = calculate_referral_rewards(current_refs)
    next_milestone_refs = None
    next_milestone_rewards = None
    
    if current_refs < 3:
        next_milestone_refs = 3
        next_milestone_rewards = 1
    elif current_refs < 4:
        next_milestone_refs = 4
        next_milestone_rewards = 2
    elif current_refs < 5:
        next_milestone_refs = 5
        next_milestone_rewards = 5
    elif current_refs < 10:
        next_milestone_refs = 10
        next_milestone_rewards = 7
    elif current_refs < 15:
        next_milestone_refs = 15
        next_milestone_rewards = 9
    elif current_refs < 20:
        next_milestone_refs = 20
        next_milestone_rewards = 11
    else:
        # For 20+, next milestone is +5 referrals
        next_milestone_refs = ((current_refs // 5) + 1) * 5
        next_milestone_rewards = calculate_referral_rewards(next_milestone_refs)
    
    # Build referral link
    base_url = request.build_absolute_uri('/')
    referral_link = f"{base_url}register?ref={user.referral_code}"
    
    return Response({
        'total_referrals': current_refs,  
        'active_referrals': active_referrals.count(),
        'pending_referrals': pending_referrals.count(),
        'room_credits': user.room_credits,
        'referral_code': user.referral_code,
        'referral_link': referral_link,
        'current_rewards': current_rewards,
        'next_milestone': {
            'referrals_needed': next_milestone_refs,
            'referrals_remaining': max(0, next_milestone_refs - current_refs),
            'rewards': next_milestone_rewards,
            'additional_credits': next_milestone_rewards - current_rewards
        },
        'active_referrals_list': [
            {
                'id': ref.id,
                'referred_user_email': ref.referred.email if ref.referred else None,
                'activated_at': ref.activated_at.isoformat() if ref.activated_at else None
            }
            for ref in active_referrals[:10]  # Last 10 active referrals
        ],
        'reward_history': [
            {
                'id': reward.id,
                'type': reward.reward_type,
                'credits_awarded': reward.credits_awarded,
                'details': reward.details,
                'created_at': reward.created_at.isoformat()
            }
            for reward in reward_history
        ]
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user with phone/email.
    Accepts referral code and creates pending referral if valid.
    """
    try:
        data = request.data
        
        # Required fields
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        full_name = data.get('full_name', '').strip()
        
        # Optional fields
        referral_code = data.get('referral_code', '').strip().upper()
        class_level = data.get('class_level', '').strip()
        exam_target = data.get('exam_target', '').strip()
        preferred_branches = data.get('preferred_branches', [])
        
        # Validation
        if not phone and not email:
            return Response({
                'detail': 'Either phone or email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not password:
            return Response({
                'detail': 'Password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not full_name:
            return Response({
                'detail': 'Full name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if email and CustomUser.objects.filter(email=email).exists():
            return Response({
                'detail': 'An account with this email already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if phone and CustomUser.objects.filter(phone=phone).exists():
            return Response({
                'detail': 'An account with this phone number already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate referral code if provided
        referrer = None
        if referral_code:
            try:
                referrer = CustomUser.objects.get(referral_code=referral_code)
                # Prevent self-referral (though unlikely for new users)
                if (email and referrer.email == email) or (phone and referrer.phone == phone):
                    referral_code = None
                    referrer = None
            except CustomUser.DoesNotExist:
                referral_code = None
        
        # Split full name into first and last name
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        with transaction.atomic():
            # Get phone verification status from request (if provided)
            is_phone_verified = request.data.get('is_phone_verified', False)
            
            # Create user
            user = CustomUser.objects.create_user(
                email=email if email else None,
                phone=phone if phone else None,
                password=password,
                first_name=first_name,
                last_name=last_name,
                referred_by=referral_code if referral_code else None,
                class_level=class_level if class_level else None,
                exam_target=exam_target if exam_target else None,
                preferred_branches=preferred_branches if preferred_branches else None,
                is_phone_verified=is_phone_verified,
            )
            
            # Generate referral code for new user
            if not user.referral_code:
                user.referral_code = generate_unique_referral_code()
                user.save(update_fields=['referral_code'])
            
            # Create pending referral if referral code was used
            if referral_code and referrer:
                Referral.objects.create(
                    referrer=referrer,
                    referred=user,
                    referral_code_used=referral_code,
                    status=Referral.Status.PENDING
                )
            
            # Award first login bonus
            first_login_result = award_first_login_bonus(user)
            
            # Activate referral if user was referred and phone is verified
            # Referrals will remain pending until phone is verified
            referral_activated = False
            if user.referred_by and referrer and user.is_phone_verified:
                activation_result = activate_referral(user)
                referral_activated = activation_result.get('success', False)
                if not referral_activated:
                    # If activation failed, log it but don't fail registration
                    print(f"Referral activation failed: {activation_result.get('message', 'Unknown error')}")
            # If user was referred but phone not verified, referral stays pending
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'Account created successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'phone': user.phone,
                    'full_name': user.get_full_name() or full_name,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'referral_code': user.referral_code,
                    'referred_by': user.referred_by,
                    'room_credits': user.room_credits,
                    'total_referrals': user.total_referrals,
                },
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'first_login_bonus_awarded': first_login_result.get('success', False),
                'referral_activated': referral_activated,
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'detail': f'Registration failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_referees(request):
    """
    Get list of users referred by the current user.
    Returns both active and pending referrals.
    """
    user = request.user
    
    # Get all referrals where current user is the referrer
    referrals = Referral.objects.filter(
        referrer=user
    ).select_related('referred').order_by('-created_at')
    
    referees = []
    for referral in referrals:
        referred_user = referral.referred
        if not referred_user:
            # Skip if referred user doesn't exist (shouldn't happen, but safety check)
            continue
        
        # Build full name
        first_name = referred_user.first_name or ''
        last_name = referred_user.last_name or ''
        full_name = f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = referred_user.email or referred_user.phone or 'Anonymous User'
        
        referees.append({
            'id': referred_user.id,
            'email': referred_user.email,
            'phone': referred_user.phone,
            'full_name': full_name,
            'status': referral.status, 
            'joined_at': referral.created_at.isoformat(),
            'activated_at': referral.activated_at.isoformat() if referral.activated_at else None,
        })
    
    return Response({
        'referees': referees
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    Get user's notifications.
    Returns unread notifications by default, or all if requested.
    
    Query params:
    - all: If true, returns all notifications (read and unread). Default: false (only unread)
    - limit: Maximum number of notifications to return. Default: 50
    
    Returns:
    {
        "notifications": [
            {
                "id": 1,
                "category": "GUILD",
                "category_display": "Guild",
                "message": "Your Guild results are out.",
                "is_read": false,
                "created_at": "2024-01-23T10:00:00Z"
            },
            ...
        ],
        "unread_count": 5,
        "total_count": 10
    }
    """
    user = request.user
    
    # Get query parameters
    show_all = request.query_params.get('all', 'false').lower() == 'true'
    limit = int(request.query_params.get('limit', 50))
    
    # Build queryset
    queryset = Notification.objects.filter(user=user)
    
    if not show_all:
        queryset = queryset.filter(is_read=False)
    
    # Order by created_at descending (newest first)
    queryset = queryset.order_by('-created_at')[:limit]
    
    # Serialize notifications
    notifications = []
    for notification in queryset:
        notifications.append({
            'id': notification.id,
            'category': notification.category,
            'category_display': notification.get_category_display(),
            'message': notification.message,
            'is_read': notification.is_read,
            'action_type': notification.action_type,
            'action_data': notification.action_data,
            'created_at': notification.created_at.isoformat()
        })
    
    # Get counts
    unread_count = Notification.objects.filter(user=user, is_read=False).count()
    total_count = Notification.objects.filter(user=user).count()
    
    return Response({
        'notifications': notifications,
        'unread_count': unread_count,
        'total_count': total_count
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a notification as read.
    
    Returns:
    {
        "message": "Notification marked as read",
        "notification": {...}
    }
    """
    user = request.user
    
    try:
        notification = Notification.objects.get(id=notification_id, user=user)
    except Notification.DoesNotExist:
        return Response({
            'detail': 'Notification not found.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    notification.is_read = True
    notification.save()
    
    return Response({
        'message': 'Notification marked as read',
        'notification': {
            'id': notification.id,
            'category': notification.category,
            'category_display': notification.get_category_display(),
            'message': notification.message,
            'is_read': notification.is_read,
            'created_at': notification.created_at.isoformat()
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    Mark all notifications as read for the current user.
    
    Returns:
    {
        "message": "All notifications marked as read",
        "updated_count": 5
    }
    """
    user = request.user
    
    updated_count = Notification.objects.filter(
        user=user,
        is_read=False
    ).update(is_read=True)
    
    return Response({
        'message': 'All notifications marked as read',
        'updated_count': updated_count
    }, status=status.HTTP_200_OK)

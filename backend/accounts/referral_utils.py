"""
Utility functions for referral and reward system.
"""
import secrets
import string
from django.utils import timezone
from .models import CustomUser, Referral, RewardHistory


def generate_unique_referral_code():
    """
    Generate a unique 8-character alphanumeric referral code.
    
    Returns:
        str: Unique referral code
    """
    while True:
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        if not CustomUser.objects.filter(referral_code=code).exists():
            return code


def calculate_referral_rewards(total_ref):
    """
    Calculate room credits based on total referrals.
    
    Rules:
    - 0-2 referrals → 0 room credits
    - 3 referrals → 1 room credit
    - 4 referrals → 2 room credits
    - 5 referrals → 5 room credits
    - 6-9 referrals → 5 room credits
    - 10 referrals → 7 room credits
    - 15 referrals → 9 room credits
    - 20 referrals → 11 room credits
    - Each +5 beyond 5 → +2 more room credits
    
    Args:
        total_ref (int): Total number of active referrals
        
    Returns:
        int: Number of room credits earned
    """
    if total_ref < 3:
        return 0
    elif total_ref == 3:
        return 1
    elif total_ref == 4:
        return 2
    elif total_ref == 5:
        return 5
    elif total_ref < 10:
        return 5
    elif total_ref == 10:
        return 7
    elif total_ref == 15:
        return 9
    elif total_ref == 20:
        return 11
    else:
        # For 20+, each +5 referrals = +2 credits
        # Formula: 11 + ((total_ref - 20) // 5) * 2
        extra = ((total_ref - 20) // 5) * 2
        return 11 + extra


def activate_referral(referred_user):
    """
    Activate a referral when the referred user logs in for the first time.
    
    For referred users, phone verification is required before activation.
    
    Args:
        referred_user (CustomUser): The user who was referred
        
    Returns:
        dict: Result with status and details
    """
    if not referred_user.referred_by:
        return {
            'success': False,
            'message': 'User was not referred'
        }
    
    # For referred users, phone verification is required before activation
    if referred_user.referred_by and not referred_user.is_phone_verified:
        return {
            'success': False,
            'message': 'Phone verification required to activate referral. Please verify your phone number first.'
        }
    
    # Find the referrer by referral code
    try:
        referrer = CustomUser.objects.get(referral_code=referred_user.referred_by)
    except CustomUser.DoesNotExist:
        return {
            'success': False,
            'message': 'Invalid referral code'
        }
    
    # Prevent self-referral
    if referrer.id == referred_user.id:
        return {
            'success': False,
            'message': 'Self-referral is not allowed'
        }
    
    # Check if referral already exists and is active
    existing_referral = Referral.objects.filter(
        referrer=referrer,
        referred=referred_user,
        status=Referral.Status.ACTIVE
    ).first()
    
    if existing_referral:
        return {
            'success': False,
            'message': 'Referral already activated'
        }
    
    # Find or create pending referral
    pending_referral = Referral.objects.filter(
        referrer=referrer,
        referral_code_used=referred_user.referred_by,
        status=Referral.Status.PENDING
    ).first()
    
    if not pending_referral:
        # Create new referral record
        pending_referral = Referral.objects.create(
            referrer=referrer,
            referred=referred_user,
            referral_code_used=referred_user.referred_by,
            status=Referral.Status.PENDING
        )
    
    # Calculate old total referrals (BEFORE activation - count existing active referrals)
    old_total_ref = Referral.objects.filter(
        referrer=referrer,
        status=Referral.Status.ACTIVE
    ).exclude(id=pending_referral.id).count()
    
    # Activate the referral
    pending_referral.status = Referral.Status.ACTIVE
    pending_referral.referred = referred_user
    pending_referral.activated_at = timezone.now()
    pending_referral.save()
    
    # Calculate new total referrals (AFTER activation)
    new_total_ref = old_total_ref + 1
    
    # Update referrer's total referrals field
    referrer.total_referrals = new_total_ref
    
    # Calculate old and new rewards
    old_rewards = calculate_referral_rewards(old_total_ref)
    new_rewards = calculate_referral_rewards(new_total_ref)
    
    credits_to_add = new_rewards - old_rewards
    
    # Add credits to referrer if any credits are earned
    if credits_to_add > 0:
        referrer.room_credits += credits_to_add
        
        # Log reward history
        RewardHistory.objects.create(
            user=referrer,
            reward_type=RewardHistory.RewardType.REFERRAL_BONUS,
            credits_awarded=credits_to_add,
            details={
                'total_referrals': new_total_ref,
                'milestone_reached': True,
                'referred_user_id': referred_user.id,
                'referred_user_email': referred_user.email or referred_user.phone
            }
        )
    
    # Always save referrer to update total_referrals (even if no credits added)
    referrer.save(update_fields=['total_referrals', 'room_credits'])
    
    return {
        'success': True,
        'message': 'Referral activated successfully',
        'referrer': referrer,
        'credits_awarded': credits_to_add,
        'total_referrals': new_total_ref
    }


def award_first_login_bonus(user):
    """
    Award first login bonus to a user.
    
    Args:
        user (CustomUser): The user to award bonus to
        
    Returns:
        dict: Result with status and details
    """
    if user.first_login_rewarded:
        return {
            'success': False,
            'message': 'First login bonus already awarded'
        }
    
    # Award 2 room credits
    user.room_credits += 2
    user.first_login_rewarded = True
    user.save()
    
    # Log reward history
    RewardHistory.objects.create(
        user=user,
        reward_type=RewardHistory.RewardType.FIRST_LOGIN,
        credits_awarded=2,
        details={
            'bonus_type': 'first_login',
            'description': 'Welcome bonus for first login'
        }
    )
    
    return {
        'success': True,
        'message': 'First login bonus awarded',
        'credits_awarded': 2,
        'total_credits': user.room_credits
    }


"""
Accounts App Serializers

Design Decisions:
1. Read-only serializers for logs (immutable audit trail)
2. Include user email for easy identification
3. Format timestamps in ISO format
4. Include metadata as-is for flexibility
"""
from rest_framework import serializers
from .models import UserLoginLog, UserActivityLog


class UserLoginLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for login logs."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserLoginLog
        fields = [
            'id',
            'user',
            'user_email',
            'email',
            'ip_address',
            'user_agent',
            'success',
            'failure_reason',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields


class UserActivityLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for activity logs."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_type_display = serializers.CharField(
        source='get_action_type_display',
        read_only=True
    )
    
    class Meta:
        model = UserActivityLog
        fields = [
            'id',
            'user',
            'user_email',
            'action_type',
            'action_type_display',
            'app_name',
            'object_id',
            'object_type',
            'ip_address',
            'user_agent',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields


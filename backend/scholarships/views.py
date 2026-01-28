from rest_framework.viewsets import ModelViewSet
from .models import Scholarship, ScholarshipEligibilityRule, ScholarshipInteraction, ScholarshipOnboarding
from .serializers import (
    ScholarshipSerializer, 
    ScholarshipEligibilityRuleSerializer, 
    ScholarshipInteractionSerializer,
    ScholarshipOnboardingSerializer
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone


class ScholarshipViewSet(ModelViewSet):
    queryset = Scholarship.objects.all()
    serializer_class = ScholarshipSerializer
    lookup_field = 'slug'  # Use slug instead of ID for SEO-friendly URLs

    def get_queryset(self):
        """Filter scholarships by status and type if provided."""
        queryset = Scholarship.objects.all()
        
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        scholarship_type = self.request.query_params.get('scholarship_type', None)
        if scholarship_type:
            queryset = queryset.filter(scholarship_type=scholarship_type)
        
        return queryset

    class Meta:
        model = Scholarship
        fields = '__all__'


class ScholarshipEligibilityRuleViewSet(ModelViewSet):
    queryset = ScholarshipEligibilityRule.objects.all()
    serializer_class = ScholarshipEligibilityRuleSerializer

    def get_queryset(self):
        """Filter eligibility rules by scholarship_id or scholarship_slug if provided."""
        queryset = ScholarshipEligibilityRule.objects.all()
        
        scholarship_id = self.request.query_params.get('scholarship_id', None)
        scholarship_slug = self.request.query_params.get('scholarship_slug', None)
        
        if scholarship_id:
            queryset = queryset.filter(scholarship_id=scholarship_id)
        elif scholarship_slug:
            queryset = queryset.filter(scholarship__slug=scholarship_slug)
        
        return queryset

    class Meta:
        model = ScholarshipEligibilityRule
        fields = '__all__'


class ScholarshipInteractionViewSet(ModelViewSet):
    queryset = ScholarshipInteraction.objects.all()
    serializer_class = ScholarshipInteractionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter interactions by current user."""
        user = self.request.user
        queryset = ScholarshipInteraction.objects.filter(student=user).select_related('scholarship')
        
        # Filter by scholarship_id or scholarship_slug if provided
        scholarship_id = self.request.query_params.get('scholarship_id', None)
        scholarship_slug = self.request.query_params.get('scholarship_slug', None)
        
        if scholarship_id:
            queryset = queryset.filter(scholarship_id=scholarship_id)
        elif scholarship_slug:
            queryset = queryset.filter(scholarship__slug=scholarship_slug)
        
        return queryset

    def perform_create(self, serializer):
        """Set the student to the current user and update last_interacted_at."""
        instance = serializer.save(student=self.request.user, last_interacted_at=timezone.now())
        # If status is redirected, set redirected_at timestamp
        if instance.status == ScholarshipInteraction.Status.REDIRECTED:
            instance.redirected_at = timezone.now()
            instance.notification_sent = False
            instance.save(update_fields=['redirected_at', 'notification_sent'])
    
    def perform_update(self, serializer):
        """Update last_interacted_at when interaction is updated."""
        # Get the old instance to check if status changed
        old_instance = self.get_object()
        old_status = old_instance.status
        
        instance = serializer.save(last_interacted_at=timezone.now())
        
        # If status changed to redirected, set redirected_at timestamp
        if instance.status == ScholarshipInteraction.Status.REDIRECTED and old_status != ScholarshipInteraction.Status.REDIRECTED:
            instance.redirected_at = timezone.now()
            instance.notification_sent = False
            instance.save(update_fields=['redirected_at', 'notification_sent'])



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_applied_scholarships(request):
    user = request.user
    
    if user.is_authenticated:
        applied_scholarships = ScholarshipInteraction.objects.filter(student=user).select_related('scholarship')
        serializer = ScholarshipInteractionSerializer(applied_scholarships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    else:
        return Response(status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_scholarship_notification_response(request):
    """
    Handle Yes/No response from scholarship application notification.
    
    Expected payload:
    {
        "notification_id": 1,
        "response": "yes" or "no"
    }
    """
    from accounts.models import Notification
    
    notification_id = request.data.get('notification_id')
    response = request.data.get('response', '').lower()
    
    if not notification_id:
        return Response(
            {'detail': 'notification_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if response not in ['yes', 'no']:
        return Response(
            {'detail': 'response must be "yes" or "no"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        notification = Notification.objects.get(
            id=notification_id,
            user=request.user,
            action_type='scholarship_apply_confirm'
        )
    except Notification.DoesNotExist:
        return Response(
            {'detail': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get interaction from action_data
    action_data = notification.action_data or {}
    interaction_id = action_data.get('interaction_id')
    
    if not interaction_id:
        return Response(
            {'detail': 'Invalid notification data'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        interaction = ScholarshipInteraction.objects.get(
            id=interaction_id,
            student=request.user
        )
    except ScholarshipInteraction.DoesNotExist:
        return Response(
            {'detail': 'Scholarship interaction not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Update interaction status based on response
    if response == 'yes':
        interaction.status = ScholarshipInteraction.Status.APPLIED
        interaction.applied_at = timezone.now()
        interaction.save(update_fields=['status', 'applied_at'])
        
        # Mark notification as read
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        
        return Response({
            'detail': 'Application status updated to Applied',
            'interaction': ScholarshipInteractionSerializer(interaction).data
        }, status=status.HTTP_200_OK)
    else:
        # User said no - just mark notification as read
        notification.is_read = True
        interaction.status = ScholarshipInteraction.Status.NOT_STARTED
        interaction.save(update_fields=['status'])
        notification.save(update_fields=['is_read'])
        
        return Response({
            'detail': 'Notification marked as read',
            'interaction': ScholarshipInteractionSerializer(interaction).data
        }, status=status.HTTP_200_OK)


class ScholarshipOnboardingViewSet(ModelViewSet):
    """
    ViewSet for Scholarship Onboarding.
    Each user can have only one onboarding record (OneToOne relationship).
    """
    serializer_class = ScholarshipOnboardingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return only the current user's onboarding data."""
        return ScholarshipOnboarding.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Get or return the user's onboarding data."""
        try:
            onboarding = ScholarshipOnboarding.objects.get(user=request.user)
            serializer = self.get_serializer(onboarding)
            return Response([serializer.data], status=status.HTTP_200_OK)
        except ScholarshipOnboarding.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
    
    def retrieve(self, request, *args, **kwargs):
        """Get or create the user's onboarding record."""
        onboarding, created = ScholarshipOnboarding.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(onboarding)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
        """Create or update the user's onboarding data."""
        # Check if onboarding already exists
        try:
            onboarding = ScholarshipOnboarding.objects.get(user=request.user)
            # Update existing
            serializer = self.get_serializer(onboarding, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ScholarshipOnboarding.DoesNotExist:
            # Create new
            return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update the user's onboarding data."""
        # Get or create the onboarding record
        onboarding, created = ScholarshipOnboarding.objects.get_or_create(
            user=request.user
        )
        kwargs['pk'] = onboarding.id
        return super().update(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Set the user to the current user."""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Update the user's onboarding data."""
        serializer.save(user=self.request.user)


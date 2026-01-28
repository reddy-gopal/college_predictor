from django.urls import path, include

from rest_framework.routers import DefaultRouter

router = DefaultRouter()

from .views import (
    ScholarshipViewSet, 
    ScholarshipEligibilityRuleViewSet, 
    ScholarshipInteractionViewSet,
    ScholarshipOnboardingViewSet,
    get_applied_scholarships,
    handle_scholarship_notification_response
)
router.register(r'scholarships', ScholarshipViewSet, basename='scholarship')
router.register(r'scholarship-eligibility-rules', ScholarshipEligibilityRuleViewSet, basename='scholarship-eligibility-rule')
router.register(r'scholarship-interactions', ScholarshipInteractionViewSet, basename='scholarship-interaction')
router.register(r'scholarship-onboarding', ScholarshipOnboardingViewSet, basename='scholarship-onboarding')

urlpatterns = [
    path('applied-scholarships/', get_applied_scholarships, name='get_applied_scholarships'),
    path('handle-notification-response/', handle_scholarship_notification_response, name='handle_scholarship_notification_response'),
    path('', include(router.urls)),
]
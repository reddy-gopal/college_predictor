from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MockTestViewSet,
    QuestionViewSet,
    DifficultyLevelViewSet,
    TestCategoryViewSet,
    StudentProfileViewSet,
    TestAttemptViewSet,
    StudentAnswerViewSet,
    MistakeNotebookViewSet,
    StudyGuildViewSet,
    XPLogViewSet,
    LeaderboardViewSet,
)

router = DefaultRouter()

router.register(r'mock-tests', MockTestViewSet, basename='mocktest')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'difficulty-levels', DifficultyLevelViewSet, basename='difficultylevel')
router.register(r'test-categories', TestCategoryViewSet, basename='testcategory')
router.register(r'student-profiles', StudentProfileViewSet, basename='studentprofile')
router.register(r'test-attempts', TestAttemptViewSet, basename='testattempt')
router.register(r'student-answers', StudentAnswerViewSet, basename='studentanswer')
router.register(r'mistake-notebook', MistakeNotebookViewSet, basename='mistakenotebook')
router.register(r'study-guilds', StudyGuildViewSet, basename='studyguid')
router.register(r'xp-logs', XPLogViewSet, basename='xplog')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')

urlpatterns = [
    path('', include(router.urls)),
]

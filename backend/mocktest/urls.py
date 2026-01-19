from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ExamViewSet,
    MockTestViewSet,
    QuestionViewSet,
    DifficultyLevelViewSet,
    StudentProfileViewSet,
    TestAttemptViewSet,
    StudentAnswerViewSet,
    MistakeNotebookViewSet,
    StudyGuildViewSet,
    XPLogViewSet,
    LeaderboardViewSet,
    DailyFocusViewSet,
    RoomViewSet,
    ParticipantAttemptViewSet,
    gamification_summary,
    get_todays_tasks,
    complete_task,
    generate_test_from_mistakes,
    get_exam_years,
    get_available_questions_count,
    generate_test,
    generate_custom_test,
    preview_room_test_summary,
)

router = DefaultRouter()

router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'mock-tests', MockTestViewSet, basename='mocktest')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'difficulty-levels', DifficultyLevelViewSet, basename='difficultylevel')
router.register(r'student-profiles', StudentProfileViewSet, basename='studentprofile')
router.register(r'test-attempts', TestAttemptViewSet, basename='testattempt')
router.register(r'student-answers', StudentAnswerViewSet, basename='studentanswer')
router.register(r'mistake-notebook', MistakeNotebookViewSet, basename='mistakenotebook')
router.register(r'study-guilds', StudyGuildViewSet, basename='studyguid')
router.register(r'xp-logs', XPLogViewSet, basename='xplog')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'daily-focus', DailyFocusViewSet, basename='dailyfocus')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'participant-attempts', ParticipantAttemptViewSet, basename='participantattempt')

urlpatterns = [
    # Custom endpoints (must come before router.urls to avoid conflicts)
    path('mistake-notebook/generate-test/', generate_test_from_mistakes, name='generate_test_from_mistakes'),
    path('tasks/', get_todays_tasks, name='get_todays_tasks'),
    path('tasks/complete/', complete_task, name='complete_task'),
    path('gamification/summary/', gamification_summary, name='gamification_summary'),
    path('exam-years/', get_exam_years, name='get_exam_years'),
    path('available-questions-count/', get_available_questions_count, name='get_available_questions_count'),
    path('generate-test/', generate_test, name='generate_test'),
    path('custom-test/generate/', generate_custom_test, name='generate_custom_test'),
    path('rooms/preview-test-summary/', preview_room_test_summary, name='preview_room_test_summary'),
    # Router URLs (must come last)
    path('', include(router.urls)),
]

from django.urls import path
from . import views

urlpatterns = [
    path('google-login/', views.google_login, name='google_login'),
    path('update-profile/', views.update_profile, name='update_profile'),
    path('me/', views.get_current_user, name='get_current_user'),
]


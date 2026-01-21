from django.urls import path
from . import views

urlpatterns = [
    path('google-login/', views.google_login, name='google_login'),
    path('register/', views.register_user, name='register_user'),
    path('update-profile/', views.update_profile, name='update_profile'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('send-otp/', views.send_otp, name='send_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('referral/activate/', views.activate_referral_endpoint, name='activate_referral'),
    path('referral/process/', views.process_referral_code, name='process_referral_code'),
    path('referral/stats/', views.get_referral_stats, name='referral_stats'),
    path('referee/', views.list_referees, name='list_referees'),
]


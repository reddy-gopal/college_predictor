from django.contrib import admin

from .models import Exam, College, Course, Cutoff, Prediction, ScoreToRank

admin.site.register(Exam)
admin.site.register(College)
admin.site.register(Course)
admin.site.register(Cutoff)
admin.site.register(Prediction)
admin.site.register(ScoreToRank)
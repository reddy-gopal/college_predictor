from django.contrib import admin

from .models import ExamModel, CollegeModel, CourseModel, CutoffModel, Prediction, ScoreToRankModel

admin.site.register(ExamModel)
admin.site.register(CollegeModel)
admin.site.register(CourseModel)
admin.site.register(CutoffModel)
admin.site.register(Prediction)
admin.site.register(ScoreToRankModel)
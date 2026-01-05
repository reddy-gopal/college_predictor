from django.db import models


class ExamModel(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class CollegeModel(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    college_type = models.CharField(
        max_length=20,
        choices=[
            ('Private', 'Private'),
            ('Government', 'Government'),
        ],
        default='Private'
    )

    def __str__(self):
        return self.name


class CourseModel(models.Model):
    name = models.CharField(max_length=255)
    college = models.ForeignKey(CollegeModel, on_delete=models.CASCADE)
    duration = models.IntegerField()
    degree = models.CharField(
        max_length=50,
        choices=[
            ('Bachelor of Technology', 'B.Tech'),
            ('Master of Technology', 'M.Tech'),
            ('Bachelor of Science', 'B.Sc'),
            ('Master of Science', 'M.Sc'),
            ('Bachelor of Arts', 'B.A'),
            ('Master of Arts', 'M.A'),
        ],
        default='B.Tech'
    )
    branch = models.CharField(
        max_length=100,
        choices=[
            ('Computer Science and Engineering', 'CSE'),
            ('Electronics and Communication Engineering', 'ECE'),
            ('Electrical and Electronics Engineering', 'EEE'),
            ('Mechanical Engineering', 'ME'),
            ('Civil Engineering', 'CE'),
        ],
        default='CSE'
    )
    total_seats = models.IntegerField()


    def __str__(self):
        return self.name


class CutoffModel(models.Model):
    exam = models.ForeignKey(ExamModel, on_delete=models.CASCADE)
    course = models.ForeignKey(CourseModel, on_delete=models.CASCADE)
    year = models.IntegerField()
    category = models.CharField(
        max_length=20,
        choices=[
            ('General', 'General'),
            ('SC', 'SC'),
            ('ST', 'ST'),
            ('OBC', 'OBC'),
            ('EWS', 'EWS'),
            ('GEN-EWS', 'GEN-EWS'),
            ('GEN-EWS-PWD', 'GEN-EWS-PWD'),
            ('GEN-PWD', 'GEN-PWD'),
            ('OBC-NCL', 'OBC-NCL'),
            ('OBC-NCL-PWD', 'OBC-NCL-PWD'),
            ('SC-PWD', 'SC-PWD'),
            ('ST-PWD', 'ST-PWD'),
            ('EWS-PWD', 'EWS-PWD'),
        ]
    )
    quota = models.CharField(
        max_length=10,
        choices=[
            ('State', 'State'),
            ('AIQ', 'AIQ'),
            # IIT/NIT specific quotas
            ('AI', 'AI'),  # All India
            ('AP', 'AP'),  # Andhra Pradesh
            ('GO', 'GO'),  # Goa
            ('HS', 'HS'),  # Home State
            ('JK', 'JK'),  # Jammu & Kashmir
            ('LA', 'LA'),  # Ladakh
            ('OS', 'OS'),  # Other State
        ]
    )
    state = models.CharField(max_length=255, default='All')
    opening_rank = models.IntegerField()
    closing_rank = models.IntegerField()
    seat_type = models.CharField(
        max_length=100,
        choices=[
            ('OPEN', 'OPEN'),
            ('OPEN (PwD)', 'OPEN (PwD)'),
            ('OBC-NCL', 'OBC-NCL'),
            ('OBC-NCL (PwD)', 'OBC-NCL (PwD)'),
            ('SC', 'SC'),
            ('SC (PwD)', 'SC (PwD)'),
            ('ST', 'ST'),
            ('ST (PwD)', 'ST (PwD)'),
            ('EWS', 'EWS'),
            ('EWS (PwD)', 'EWS (PwD)'),
        ],
        default='OPEN'
    )

    def __str__(self):
        return f"{self.exam.name} {self.course.name} {self.year} {self.category} {self.quota}"



class Prediction(models.Model):
    input_rank = models.IntegerField()
    exam = models.ForeignKey(ExamModel, on_delete=models.CASCADE)
    category = models.CharField(
        max_length=10,
        choices=[
            ('General', 'General'),
            ('SC', 'SC'),
            ('ST', 'ST'),
            ('OBC', 'OBC'),
        ]
    )    
    state = models.CharField(max_length=255)
    branch_list = models.JSONField(default=list)
    timestamp = models.DateTimeField(auto_now_add=True)
    predicted_result = models.JSONField()

    def __str__(self):
        return f"{self.input_rank} {self.exam.name} {self.category} {self.state} {self.timestamp}"
        
        
        

class ScoreToRankModel(models.Model):
    exam = models.ForeignKey(ExamModel, on_delete=models.CASCADE)
    score_low = models.IntegerField(null=True, blank=True)
    score_high = models.IntegerField(null=True, blank=True)
    percentile_low = models.FloatField(null=True, blank=True) 
    percentile_high = models.FloatField(null=True, blank=True)
    rank_low = models.IntegerField()
    rank_high = models.IntegerField()
    year = models.IntegerField()
    category = models.CharField(
        max_length=10,
        choices=[
            ('General', 'General'),
            ('SC', 'SC'),
            ('ST', 'ST'),
            ('OBC', 'OBC'),
        ]
    )

    def __str__(self):
        return f"{self.exam.name} {self.year} {self.category} {self.score_low} {self.score_high} {self.percentile_low} {self.percentile_high} {self.rank_low} {self.rank_high}"



        
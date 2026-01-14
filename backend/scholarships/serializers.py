"""
Scholarships App Serializers

Design Decisions:
1. Separate create/update/read serializers for applications
2. Nested serializers for related objects
3. Read-only fields for calculated/audit fields
4. Validation for application status transitions
5. Admin-only serializers for reviews
"""
from rest_framework import serializers
from django.conf import settings
from .models import (
    Scholarship, ScholarshipEligibilityRule, ScholarshipApplication,
    ScholarshipDocument, ApplicationReview
)


class ScholarshipEligibilityRuleSerializer(serializers.ModelSerializer):
    """Serializer for ScholarshipEligibilityRule."""
    rule_type_display = serializers.CharField(
        source='get_rule_type_display',
        read_only=True
    )
    
    class Meta:
        model = ScholarshipEligibilityRule
        fields = [
            'id',
            'scholarship',
            'rule_type',
            'rule_type_display',
            'rule_value',
            'description',
            'is_required',
            'order',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ScholarshipListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Scholarship list views."""
    scholarship_type_display = serializers.CharField(
        source='get_scholarship_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    applications_count = serializers.IntegerField(
        source='applications.count',
        read_only=True
    )
    
    class Meta:
        model = Scholarship
        fields = [
            'id',
            'title',
            'provider_name',
            'scholarship_type',
            'scholarship_type_display',
            'amount',
            'amount_description',
            'application_deadline',
            'status',
            'status_display',
            'is_active',
            'applications_count',
            'created_at',
        ]


class ScholarshipDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Scholarship."""
    scholarship_type_display = serializers.CharField(
        source='get_scholarship_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    eligibility_rules = ScholarshipEligibilityRuleSerializer(
        source='detailed_eligibility_rules',
        many=True,
        read_only=True
    )
    applications_count = serializers.IntegerField(
        source='applications.count',
        read_only=True
    )
    
    class Meta:
        model = Scholarship
        fields = [
            'id',
            'title',
            'description',
            'provider_name',
            'provider_website',
            'scholarship_type',
            'scholarship_type_display',
            'amount',
            'amount_description',
            'application_deadline',
            'status',
            'status_display',
            'is_active',
            'eligibility_rules',
            'required_documents',
            'application_instructions',
            'applications_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'applications_count']


class ScholarshipDocumentSerializer(serializers.ModelSerializer):
    """Serializer for ScholarshipDocument."""
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ScholarshipDocument
        fields = [
            'id',
            'application',
            'document_type',
            'document_type_display',
            'file',
            'file_url',
            'file_name',
            'file_size',
            'description',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'file_size', 'uploaded_at']
    
    def get_file_url(self, obj):
        """Return file URL if file exists."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ScholarshipApplicationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for ScholarshipApplication list."""
    student_email = serializers.EmailField(
        source='student.email',
        read_only=True
    )
    scholarship_title = serializers.CharField(
        source='scholarship.title',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    documents_count = serializers.IntegerField(
        source='documents.count',
        read_only=True
    )
    
    class Meta:
        model = ScholarshipApplication
        fields = [
            'id',
            'student',
            'student_email',
            'scholarship',
            'scholarship_title',
            'status',
            'status_display',
            'submitted_at',
            'documents_count',
            'created_at',
        ]


class ScholarshipApplicationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ScholarshipApplication."""
    student_email = serializers.EmailField(
        source='student.email',
        read_only=True
    )
    scholarship = ScholarshipDetailSerializer(read_only=True)
    scholarship_id = serializers.PrimaryKeyRelatedField(
        queryset=Scholarship.objects.filter(status='active', is_active=True),
        source='scholarship',
        write_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    documents = ScholarshipDocumentSerializer(
        many=True,
        read_only=True
    )
    reviews = serializers.SerializerMethodField()
    
    class Meta:
        model = ScholarshipApplication
        fields = [
            'id',
            'student',
            'student_email',
            'scholarship',
            'scholarship_id',
            'status',
            'status_display',
            'personal_statement',
            'additional_info',
            'submitted_at',
            'reviewed_at',
            'documents',
            'reviews',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'student',
            'submitted_at',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
    
    def get_reviews(self, obj):
        """Return reviews (admin only or own application)."""
        request = self.context.get('request')
        if request and (request.user.is_staff or request.user == obj.student):
            return ApplicationReviewSerializer(
                obj.reviews.all(),
                many=True,
                context=self.context
            ).data
        return []


class ScholarshipApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a scholarship application."""
    scholarship_id = serializers.PrimaryKeyRelatedField(
        queryset=Scholarship.objects.filter(status='active', is_active=True),
        source='scholarship'
    )
    
    class Meta:
        model = ScholarshipApplication
        fields = [
            'scholarship_id',
            'personal_statement',
            'additional_info',
        ]
    
    def validate(self, data):
        """Validate scholarship is open for applications."""
        scholarship = data['scholarship']
        
        if scholarship.status != 'active':
            raise serializers.ValidationError(
                'This scholarship is not currently accepting applications.'
            )
        
        if scholarship.application_deadline:
            from django.utils import timezone
            if timezone.now() > scholarship.application_deadline:
                raise serializers.ValidationError(
                    'Application deadline has passed.'
                )
        
        return data
    
    def create(self, validated_data):
        """Set student from request context."""
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)


class ScholarshipApplicationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a scholarship application."""
    
    class Meta:
        model = ScholarshipApplication
        fields = [
            'personal_statement',
            'additional_info',
        ]
    
    def validate(self, data):
        """Prevent updates after submission."""
        instance = self.instance
        if instance.status not in ['draft']:
            raise serializers.ValidationError(
                'Cannot update application after submission.'
            )
        return data


class ApplicationReviewSerializer(serializers.ModelSerializer):
    """Serializer for ApplicationReview (admin only)."""
    reviewer_email = serializers.EmailField(
        source='reviewer.email',
        read_only=True
    )
    decision_display = serializers.CharField(
        source='get_decision_display',
        read_only=True
    )
    application_student_email = serializers.EmailField(
        source='application.student.email',
        read_only=True
    )
    application_scholarship_title = serializers.CharField(
        source='application.scholarship.title',
        read_only=True
    )
    
    class Meta:
        model = ApplicationReview
        fields = [
            'id',
            'application',
            'application_student_email',
            'application_scholarship_title',
            'reviewer',
            'reviewer_email',
            'decision',
            'decision_display',
            'comments',
            'student_feedback',
            'reviewed_at',
            'created_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewed_at', 'created_at']
    
    def create(self, validated_data):
        """Set reviewer from request context and update application status."""
        validated_data['reviewer'] = self.context['request'].user
        
        review = super().create(validated_data)
        
        # Update application status based on review decision
        application = review.application
        if review.decision == 'approved':
            application.status = 'approved'
        elif review.decision == 'rejected':
            application.status = 'rejected'
        elif review.decision == 'needs_more_info':
            application.status = 'under_review'
        
        from django.utils import timezone
        application.reviewed_at = timezone.now()
        application.save()
        
        return review


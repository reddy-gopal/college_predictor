
from rest_framework import serializers
from .models import Scholarship, ScholarshipEligibilityRule, ScholarshipInteraction, ScholarshipOnboarding
from accounts.models import CustomUser
from django.utils.text import slugify

class ScholarshipSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(read_only=True)
    
    class Meta:
        model = Scholarship
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'slug']
    
    # Slug generation is now handled in the model's save() method
    # No need to override create() or update() methods

class ScholarshipEligibilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScholarshipEligibilityRule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class ScholarshipInteractionSerializer(serializers.ModelSerializer):
    # For writes: accept scholarship ID
    # For reads: return full scholarship object via to_representation
    scholarship = serializers.PrimaryKeyRelatedField(
        queryset=Scholarship.objects.all(),
        required=False
    )
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = ScholarshipInteraction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'student']
    
    def to_representation(self, instance):
        """Override to include full scholarship object in response."""
        representation = super().to_representation(instance)
        # Replace scholarship ID with full scholarship object
        representation['scholarship'] = ScholarshipSerializer(instance.scholarship).data
        return representation

class ScholarshipOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScholarshipOnboarding
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']
    
    def create(self, validated_data):
        """Set the user to the current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = '__all__' 
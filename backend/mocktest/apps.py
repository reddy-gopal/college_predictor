from django.apps import AppConfig


class MocktestConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mocktest'
    
    def ready(self):
        """Import signals when app is ready."""
        import mocktest.signals  # noqa
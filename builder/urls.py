from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildViewSet, ValidateBuildView, AiRigVisualizerView

router = DefaultRouter()
router.register(r'builds', BuildViewSet, basename='build')

urlpatterns = [
    path('validate/', ValidateBuildView.as_view(), name='build-validate'),
    path('ai-render/', AiRigVisualizerView.as_view(), name='build-ai-render'),
    path('', include(router.urls)),
]

from django.views.generic import TemplateView

from builder.models import Build
from components.models import Category, Component
from marketplace.models import Listing


class MarketplacePage(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Все корневые категории
        context['categories'] = Category.objects.all().order_by('name')
        # Список товаров для витрины
        context['listings'] = Listing.objects.filter(is_active=True).select_related(
            'component__category', 'seller'
        ).order_by('-created_at')
        context['components'] = Component.objects.select_related('category').order_by('category__name', 'brand', 'name')
        return context


class LoginPageView(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Sign In · RigForge'
        return context


class RegisterPageView(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = 'Create Account · RigForge'
        return context


class ComponentsPage(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['components'] = Component.objects.select_related('category').order_by('category__name', 'brand', 'name')
        return context


class ComponentPickerPage(ComponentsPage):
    template_name = 'spa_index.html'


class BuildsPage(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context['builds'] = Build.objects.filter(user=user).prefetch_related('items__component') if user.is_authenticated else Build.objects.none()
        return context


class BuilderPage(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['components'] = Component.objects.select_related('category').order_by('category__name', 'brand', 'name')
        user = self.request.user
        context['builds'] = Build.objects.filter(user=user).prefetch_related('items__component') if user.is_authenticated else Build.objects.none()
        return context


class ListingDetailPage(TemplateView):
    template_name = 'spa_index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['listing'] = Listing.objects.filter(pk=self.kwargs['listing_id'], is_active=True).select_related(
            'component__category', 'seller'
        ).first()
        return context

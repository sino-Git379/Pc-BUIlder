def role_for_user(user):
    if not user or not user.is_authenticated:
        return 'Guest'
    if user.is_superuser or user.is_staff:
        return 'Admin'
    if user.groups.filter(name__iexact='Manager').exists():
        return 'Manager'
    return 'Buyer'


def can_manage_listings(user):
    return role_for_user(user) in {'Manager', 'Admin'}

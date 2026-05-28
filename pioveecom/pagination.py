from rest_framework.pagination import PageNumberPagination


class FlexiblePagination(PageNumberPagination):
    """
    Pagination that allows clients to override the page size via ?page_size=N.
    - Default: 12 (set by PAGE_SIZE in settings)
    - Max allowed: 500 (for admin bulk loads)
    """
    page_size_query_param = 'page_size'
    max_page_size = 500

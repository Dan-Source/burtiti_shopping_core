import threading

from django.db.models.signals import post_save
from django.dispatch import receiver
from haystack import connections
from oscar.apps.catalogue.models import Product


@receiver(post_save, sender=Product)
def update_index_on_save(sender, instance, **kwargs):
    def do_index():
        unified_index = connections["default"].get_unified_index()
        index = unified_index.get_index(Product)
        index.update_object(instance)

    threading.Timer(0.5, do_index).start()

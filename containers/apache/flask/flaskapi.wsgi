#!/usr/bin/python
import os
import sys
import logging

logging.basicConfig(stream=sys.stderr)
sys.path.insert(0, '/var/www/api/')
from flaskapi import api as application
application.secret_key = os.getenv("FLASK_SECRET_KEY")

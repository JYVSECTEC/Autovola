#!/bin/bash

docker-compose stop analyse
docker-compose rm -f analyse
docker rmi autovola/analyse:latest
docker rmi ubuntu:latest
docker load --input containers/images/ubuntu_analyse.tar
docker-compose pull analyse
docker-compose up -d --build analyse

# debian version
# 10 (Buster)
# 11 (Bullseye)
# 12 (Bookworm)
# 13 (Trixie)
# 14 (Forky)

# for main image
ARG DOCKER_NODE_VERSION=22.16.0-bookworm

# for builder images
ARG DOCKER_GO_VERSION=1.24.4-bookworm
ARG DOCKER_JQ_VERSION=1.8.0
ARG DOCKER_YQ_VERSION=4.45.4
ARG DOCKER_TAPLO_VERSION=0.10.0

# for go install
ARG GO_DOCKERFMT_VERSION=v0.3.7
ARG GO_SHFMT_VERSION=v3.11.0
ARG GO_GO_TASK_VERSION=v3.44.0

# for npm tools
ARG NPM_PRETTIER_VERSION=3.5.3
ARG NPM_RENOVATE_VERSION=40.61.2

# for pip tools
ARG PIP_PIP_VERSION=25.1.1
ARG PIP_UV_VERSION=0.7.13

# for other tools
ARG OTHER_DUCKDB_VERSION=1.3.1

# ##########################################################################################
# builder images
# ##########################################################################################

# golang
# https://hub.docker.com/_/golang
FROM golang:${DOCKER_GO_VERSION} AS golang-builder

# dockerfmt
# https://github.com/reteps/dockerfmt
ARG GO_DOCKERFMT_VERSION
RUN go install github.com/reteps/dockerfmt@${GO_DOCKERFMT_VERSION}

# shfmt
# https://github.com/mvdan/sh
ARG GO_SHFMT_VERSION
RUN go install mvdan.cc/sh/v3/cmd/shfmt@${GO_SHFMT_VERSION}

# go-task
# https://github.com/go-task/task
# https://taskfile.dev/
ARG GO_GO_TASK_VERSION
RUN go install github.com/go-task/task/v3/cmd/task@${GO_GO_TASK_VERSION}

# jq
# https://github.com/mikefarah/yq
# https://github.com/jqlang/jq
FROM ghcr.io/jqlang/jq:${DOCKER_JQ_VERSION} AS jq-builder

# yq
# https://github.com/mikefarah/yq
# https://hub.docker.com/r/mikefarah/yq
FROM mikefarah/yq:${DOCKER_YQ_VERSION} AS yq-builder

# taplo
# https://github.com/tamasfe/taplo
# https://taplo.tamasfe.dev/
# https://hub.docker.com/r/tamasfe/taplo
FROM tamasfe/taplo:${DOCKER_TAPLO_VERSION} AS taplo-builder

# ##########################################################################################
# main image
# ##########################################################################################

# node
# https://hub.docker.com/_/node
# https://note.milldea.com/posts/two-ways-to-install-nodejs-with-fixed-version-in-dockerfile
FROM node:${DOCKER_NODE_VERSION}
ENV DEBIAN_FRONTEND=noninteractive
ENV DEBCONF_NOWARNINGS=yes

# add distribution packages
RUN apt-get -y update
RUN apt-get -y install \
    ca-certificates \
    curl \
    git \
    nano \
    less \
    zip \
    unzip

# dockerfmt
# refs above
COPY --from=golang-builder /go/bin/dockerfmt /usr/local/bin/

# shfmt
# refs above
COPY --from=golang-builder /go/bin/shfmt /usr/local/bin/

# go-task
# refs above
COPY --from=golang-builder /go/bin/task /usr/local/bin/

# jq
# refs above
COPY --from=jq-builder /jq /usr/local/bin/

# yq
# refs above
COPY --from=yq-builder /usr/bin/yq /usr/local/bin/

# taplo
# refs above
COPY --from=taplo-builder /taplo /usr/local/bin/

# prettier
# https://prettier.io/docs/install
ARG NPM_PRETTIER_VERSION
RUN yarn global add prettier@${NPM_PRETTIER_VERSION}

# renovate
# https://github.com/renovatebot/renovate
# https://www.npmjs.com/package/renovate
ARG NPM_RENOVATE_VERSION
RUN yarn global add renovate@${NPM_RENOVATE_VERSION}

# Duckdb
# https://github.com/duckdb/duckdb
# https://duckdb.org/docs/stable/
# https://duckdb.org/docs/installation/?version=stable&environment=cli&platform=linux&download_method=direct&architecture=arm64
ARG OTHER_DUCKDB_VERSION
RUN curl -fsSL -o /duckdb_cli.zip https://github.com/duckdb/duckdb/releases/download/v1.3.0/duckdb_cli-linux-$(uname -m | sed 's/aarch64/arm64/' | sed 's/x86_64/amd64/').zip \
    && unzip /duckdb_cli.zip \
    && chmod +x duckdb \
    && mv duckdb /usr/local/bin/ \
    && rm /duckdb_cli.zip

# Install Python
RUN apt-get -y install python3 python3-pip python3-venv python-is-python3

# change default user from 'node' to 'vscode'
ARG USERNAME=vscode
RUN usermod -l $USERNAME -d /home/$USERNAME -m node \
    && groupmod -n $USERNAME node \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL >/etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME
USER $USERNAME

# python venv
RUN python3 -m venv /home/vscode/.local/
ENV PATH=/home/vscode/.local/bin:$PATH

# pip
# https://pypi.org/project/pip/
ARG PIP_PIP_VERSION
RUN pip install --upgrade pip==${PIP_PIP_VERSION}

# uv
# https://github.com/astral-sh/uv
# https://pypi.org/project/uv/
ARG PIP_UV_VERSION
RUN pip install uv==${PIP_UV_VERSION}

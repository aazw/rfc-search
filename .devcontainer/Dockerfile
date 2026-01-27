FROM jetpackio/devbox:0.16.0 AS builder

WORKDIR /code/rfc-search
USER root:root
RUN mkdir -p /code/rfc-search && chown ${DEVBOX_USER}:${DEVBOX_USER} /code/rfc-search
USER ${DEVBOX_USER}:${DEVBOX_USER}

COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.json devbox.json
COPY --chown=${DEVBOX_USER}:${DEVBOX_USER} devbox.lock devbox.lock
RUN devbox install


FROM aazw/devcontainers-devbox-python-js:6 AS runtime

USER root
COPY --from=builder /nix/store /nix/store
COPY --from=builder /code/rfc-search/.devbox /code/rfc-search/.devbox
USER vscode

ENV PATH="/code/rfc-search/.devbox/nix/profile/default/bin:${PATH}"

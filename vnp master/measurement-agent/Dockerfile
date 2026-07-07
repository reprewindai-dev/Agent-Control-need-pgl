FROM grafana/k6:latest
COPY agent.js /agent.js
ENTRYPOINT ["k6"]
CMD ["run", "/agent.js"]

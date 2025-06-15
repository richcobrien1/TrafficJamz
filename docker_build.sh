# docker build -t trafficjamz-backend ./backend
# docker build -t trafficjamz-backend -f Dockerfile .
# docker build -t trafficjamz-fullstack -f Dockerfile .
docker build --progress=plain -t trafficjamz-fullstack -f Dockerfile .

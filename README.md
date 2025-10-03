# DevSecOps Inventory Manager

This project is a **Node.js/Express-based Inventory Manager** application that demonstrates a complete **DevSecOps CI/CD pipeline**. The application provides a display page for users and an admin page to manage inventory items. It is fully automated with a Jenkins pipeline that covers build, test, code quality checks, security scans, deployment, release packaging, and monitoring.

---

## Features

- **Inventory Manager App** with user display and admin management page.
- Backend built with **Node.js and Express.js** (`server.js`, `app.js`).
- RESTful **API endpoints** for managing items.
- **Unit tests** written in Jest for functionality verification.
- **Dockerized application** for consistent deployments.
- **Continuous Integration/Delivery pipeline** with Jenkins.
- **Monitoring & observability** integrated via New Relic APM.

---

## CI/CD Pipeline Overview

The Jenkins pipeline is defined in the [`Jenkinsfile`](./Jenkinsfile) and consists of 7 stages:

1. **Build** – Install Node.js dependencies with `npm ci` to ensure a clean build.  
   _Tools:_ Node.js, npm

2. **Test** – Run Jest unit tests and publish results to Jenkins using JUnit reports.  
   _Tools:_ Jest, Jenkins JUnit plugin

3. **Code Quality** – Perform static code analysis with SonarQube/SonarCloud and enforce a quality gate.  
   _Tools:_ SonarQube, Sonar Scanner

4. **Security** – Scan for dependency vulnerabilities using `npm audit`.  
   _Tools:_ npm audit (optionally Snyk/Trivy)

5. **Deployment** – Build Docker image and deploy to AWS EC2 using CodeDeploy.  
   _Tools:_ Docker, AWS CodeDeploy, EC2

6. **Release** – Package artifacts (ZIP) and archive them in Jenkins for rollback or reuse.  
   _Tools:_ Jenkins archiveArtifacts, zip

7. **Monitoring** – Integrate with New Relic APM to track metrics, throughput, error rate, and deployment markers.  
   _Tools:_ New Relic APM

---

## Technologies Used

- **Node.js** & **Express.js** – Backend server & API
- **HTML/JavaScript** – Front-end pages (`index.html`, `admin.html`)
- **Jest** – Unit testing framework
- **SonarQube/SonarCloud** – Static code quality analysis
- **npm audit** – Dependency vulnerability scanning
- **Docker** – Containerization for consistent builds
- **AWS EC2 & CodeDeploy** – Cloud deployment
- **New Relic APM** – Application performance monitoring

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/SunainM/DevSecOps.git
cd DevSecOps

```

### Install Dependencies

```bash
npm ci
```

### Run Locally

```bash
node server.js
```

Visit: [http://localhost:3000](http://localhost:3000)
Health check endpoint: [http://localhost:3000/health](http://localhost:3000/health)

### Run Tests

```bash
npm test
```

---

## Deployment

1. **Docker Build:**

   ```bash
   docker build -t devsecops-inventory .
   docker run -d -p 3000:3000 devsecops-inventory
   ```

2. **AWS CodeDeploy:**

   - The pipeline deploys the Dockerized app to an EC2 instance.
   - Ensure IAM roles, CodeDeploy agent, and Jenkins AWS credentials are configured.

---

## Monitoring

New Relic APM is used to monitor:

- Response times
- Throughput
- Error rates
- Deployment markers

Set these environment variables before running:

```bash
export NEW_RELIC_LICENSE_KEY=<your-key>
export NEW_RELIC_APP_NAME=DevSecOps-Inventory
```

---

## Repository Links

- **Jenkinsfile:** [View](./Jenkinsfile)
- **Dockerfile:** [View](./Dockerfile)
- **Sonar Project Config:** [View](./sonar-project.properties)

---

## Author

**Sunain Mushtaq**
Computer Science Student – Deakin University
SIT223/753 – DevSecOps Project

---

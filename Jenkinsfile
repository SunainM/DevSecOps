pipeline {
  agent any

  tools {
    nodejs "NodeJS_20"   // We'll define this tool name in Jenkins -> Global Tool Config
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Test') {
      steps {
        sh 'npm run ci:test'
      }
      post {
        always {
          junit 'reports/junit/*.xml'  // publishes Jest results to Jenkins UI
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit/*.xml', fingerprint: true, onlyIfSuccessful: false
    }
  }
}

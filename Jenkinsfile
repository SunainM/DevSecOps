pipeline {
  agent any

  tools {
    nodejs "NODEJS_24"
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Build') {
      steps {
        echo "🔨 Building the project"
        // Example: if packaging into Docker
        // sh 'docker build -t my-inventory-app:latest .'
        sh 'npm install'  // simple build step for Node.js
      }
    }

    stage('Test') {
      steps {
        sh 'npm run ci:test'
      }
      post {
        always {
          junit 'reports/junit/*.xml'
          archiveArtifacts artifacts: 'coverage/**', fingerprint: true, onlyIfSuccessful: false
        }
      }
    }

    stage('Code Quality Analysis') {
      steps {
        withSonarQubeEnv('SonarCloud') {
          sh '''
            set -e
            mkdir -p .scanner
            SCANNER_VERSION=6.2.1.4610
            if [ ! -x ".scanner/sonar-scanner-$SCANNER_VERSION-linux-x64/bin/sonar-scanner" ]; then
              curl -sSL -o .scanner/scanner.zip \
                https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-$SCANNER_VERSION-linux-x64.zip
              unzip -q .scanner/scanner.zip -d .scanner
              rm .scanner/scanner.zip
            fi
            export PATH="$PWD/.scanner/sonar-scanner-$SCANNER_VERSION-linux-x64/bin:$PATH"

            sonar-scanner \
              -Dsonar.projectKey=$(grep '^sonar.projectKey=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.organization=$(grep '^sonar.organization=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.host.url=$SONAR_HOST_URL \
              -Dsonar.token=$SONAR_AUTH_TOKEN
          '''
        }
      }
    }

    stage('Security') {
        environment {
            // Gates (fail build when >0 of these severities)
            FAIL_ON_CRITICAL = '1'
            FAIL_ON_HIGH     = '1'
            FAIL_ON_MODERATE = '0'  // keep 0 to not fail on Mod/Low
            FAIL_ON_LOW      = '0'

            // Optional: try auto-fix first, then re-scan (0 = off, 1 = on)
            AUTO_FIX         = '0'
        }
        steps {
            echo "🛡️ Running dependency security audit..."

            sh '''
            set -e
            mkdir -p reports/security

            # --- 1) optional auto-fix (package-lock only to avoid surprise code changes)
            if [ "$AUTO_FIX" = "1" ]; then
                echo "🔧 Attempting npm audit fix (lockfile-only)..."
                npm audit fix --package-lock-only || true
                # ensure deps match lockfile after fix attempt
                npm ci
            fi

            # --- 2) run audit and generate summary
            npm audit --json > reports/security/npm-audit.json || true
            node scripts/generate-security-summary.js reports/security/npm-audit.json > reports/security/SECURITY_SUMMARY.md

            echo "---- SECURITY SUMMARY ----"
            cat reports/security/SECURITY_SUMMARY.md || true
            echo "--------------------------"

            # --- 3) parse counts via Node (works across npm versions)
            JSON=reports/security/npm-audit.json

            CRIT=$(node -e "let j=require('./$JSON');let c=0;if(j.vulnerabilities){for(const k in j.vulnerabilities){if(j.vulnerabilities[k].severity==='critical'){c+=(j.vulnerabilities[k].via||[]).length||1}}}else if(j.advisories){for(const k in j.advisories){if(j.advisories[k].severity==='critical'){c++}}}console.log(c)")
            HIGH=$(node -e "let j=require('./$JSON');let c=0;if(j.vulnerabilities){for(const k in j.vulnerabilities){if(j.vulnerabilities[k].severity==='high'){c+=(j.vulnerabilities[k].via||[]).length||1}}}else if(j.advisories){for(const k in j.advisories){if(j.advisories[k].severity==='high'){c++}}}console.log(c)")
            MOD=$(node -e "let j=require('./$JSON');let c=0;if(j.vulnerabilities){for(const k in j.vulnerabilities){if(j.vulnerabilities[k].severity==='moderate'){c+=(j.vulnerabilities[k].via||[]).length||1}}}else if(j.advisories){for(const k in j.advisories){if(j.advisories[k].severity==='moderate'){c++}}}console.log(c)")
            LOW=$(node -e "let j=require('./$JSON');let c=0;if(j.vulnerabilities){for(const k in j.vulnerabilities){if(j.vulnerabilities[k].severity==='low'){c+=(j.vulnerabilities[k].via||[]).length||1}}}else if(j.advisories){for(const k in j.advisories){if(j.advisories[k].severity==='low'){c++}}}console.log(c)")

            echo "Counts => Critical:$CRIT High:$HIGH Moderate:$MOD Low:$LOW"

            # --- 4) gate logic
            FAIL=0
            [ "$FAIL_ON_CRITICAL" = "1" ] && [ "$CRIT" -gt 0 ] && { echo "❌ Critical vulns found"; FAIL=1; }
            [ "$FAIL_ON_HIGH"     = "1" ] && [ "$HIGH" -gt 0 ] && { echo "❌ High vulns found"; FAIL=1; }
            [ "$FAIL_ON_MODERATE" = "1" ] && [ "$MOD"  -gt 0 ] && { echo "❌ Moderate vulns found"; FAIL=1; }
            [ "$FAIL_ON_LOW"      = "1" ] && [ "$LOW"  -gt 0 ] && { echo "❌ Low vulns found"; FAIL=1; }

            # exit code 5 = fail; 0 = ok. For only Mod/Low, we allow post { unstable } to handle.
            if [ "$FAIL" -ne 0 ]; then
                echo "Security gate failed. See SECURITY_SUMMARY.md and npm-audit.json under reports/security/"
                exit 5
            fi
            '''
        }
        post {
            always {
                archiveArtifacts artifacts: 'reports/security/*', fingerprint: true, onlyIfSuccessful: false
            }
            success {
                script {
                // No JSON, no Slurper — just read the status marker written by the shell step
                def marker = sh(returnStdout: true, script: "cat reports/security/build_status 2>/dev/null || echo OK").trim()
                if (marker == 'UNSTABLE') {
                    echo "⚠️ Moderate/Low vulns found -> marking build UNSTABLE (see SECURITY_SUMMARY.md)."
                    currentBuild.result = 'UNSTABLE'
                } else {
                    echo "✅ Security gate clean."
                }
                }
            }
        }

    }


    stage('Deploy') {
        when { expression { return env.CHANGE_ID == null } } // optional: skip on PRs
        environment {
            DOCKER_IMG = "devsecops:${env.BUILD_NUMBER}"
            GIT_SHA    = sh(returnStdout: true, script: "git rev-parse --short HEAD").trim()
            // you can push later in Release, so local tag is fine for Deploy
        }
        steps {
            echo "🐳 Building Docker image ${DOCKER_IMG} (sha:${GIT_SHA})"
            sh '''
            set -e

            # Build image
            docker build -t "${DOCKER_IMG}" .

            # Clean previous container if exists
            if [ "$(docker ps -aq -f name=devsecops-test)" ]; then
                docker rm -f devsecops-test || true
            fi

            # Run container
            docker run -d --name devsecops-test -p 3000:3000 "${DOCKER_IMG}"

            # Health check with retries
            ATTEMPTS=12   # ~60s max (12 * 5s)
            until curl -fsS http://localhost:3000/health | grep -q '{"ok":true}'; do
                ATTEMPTS=$((ATTEMPTS-1))
                if [ $ATTEMPTS -le 0 ]; then
                echo "❌ Health check failed"
                docker logs devsecops-test || true
                exit 1
                fi
                echo "Waiting for app to become healthy..."
                sleep 5
            done

            echo "✅ Deploy (test) is healthy"
            '''
        }
        post {
            success {
            echo "Deploy stage completed successfully."
            }
            failure {
            echo "Collecting container logs due to failure…"
            sh 'docker logs devsecops-test || true'
            }
            always {
            // Keep things tidy on the agent
            sh '''
                docker ps -a
                # Stop & remove the test container
                docker rm -f devsecops-test || true
                # Optionally prune dangling images (safe-ish but optional)
                docker image prune -f || true
            '''
            }
        }
    }


    stage('Release') {
      steps {
        echo "📦 Releasing to production (dummy stage)..."
        // Example: Octopus Deploy / AWS CodeDeploy
        // sh './deploy-to-prod.sh'
      }
    }

    stage('Monitoring & Alerting') {
      steps {
        echo "📊 Monitoring application (dummy stage)..."
        // Example: Datadog / New Relic
        // sh 'curl -X POST https://api.datadoghq.com/...'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit/*.xml', fingerprint: true, onlyIfSuccessful: false
    }
  }
}

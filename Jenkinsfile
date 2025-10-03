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
        when { branch 'main' }
        steps {
            sh '''
            set -e

            # Talk to your existing DinD
            export DOCKER_HOST=tcp://dind:2375

            # We will bring the stack up under a NEW project name "ci"
            export COMPOSE_PROJECT_NAME=ci

            echo "Docker endpoint: ${DOCKER_HOST}"
            docker version
            docker-compose version

            echo "Cleaning previous project/network created without COMPOSE_PROJECT_NAME..."
            # Old project name is derived from your job/workspace: "devsecops_main"
            docker-compose -p devsecops_main -f docker-compose.yml down -v --remove-orphans || true
            docker network rm devsecops_main_default || true

            # (optional) verify no leftovers
            docker network ls | grep -E 'devsecops_main_default|ci_default' || true

            echo "Bringing up only web under project 'ci'..."
            docker-compose -p ci -f docker-compose.yml up -d --build web

            echo "Waiting for health..."
            for i in $(seq 1 30); do
                if docker-compose -p ci -f docker-compose.yml exec -T web sh -lc "wget -qO- http://localhost:3000/health >/dev/null 2>&1"; then
                echo "Service healthy."; break
                fi
                echo "not ready yet... ($i/30)"; sleep 2
            done

            docker-compose -p ci -f docker-compose.yml ps
            '''
        }
        post {
            failure {
            sh '''
                mkdir -p reports/deploy
                docker-compose -p ci -f docker-compose.yml logs --no-color > reports/deploy/compose-logs.txt || true
            '''
            archiveArtifacts artifacts: 'reports/deploy/**', fingerprint: true, onlyIfSuccessful: false
            }
        }
    }



    stage('Release') {
        when { branch 'main' }
        steps {
            echo "📦 [Release Stage] Starting release process (dummy values)"

            sh '''
            set -e

            # --- Dummy AWS/CodeDeploy Simulation ---
            echo "Packaging build into zip..."
            mkdir -p reports/release
            echo "Pretend we zipped the repo here" > reports/release/DevSecOpsBuild.zip

            echo "Uploading to S3 bucket (dummy-bucket)"
            echo "aws s3 cp DevSecOpsBuild.zip s3://dummy-bucket/builds/DevSecOpsBuild.zip"

            echo "Creating CodeDeploy deployment"
            echo "aws deploy create-deployment --application-name DummyApp --deployment-group-name DummyDG"

            echo "Simulating wait for deployment status..."
            for i in $(seq 1 5); do
            echo "  -> pretending status = InProgress ($i/5)"
            sleep 1
            done

            echo "✅ Dummy deployment succeeded!"
            '''
        }
        post {
            success {
            archiveArtifacts artifacts: 'reports/release/**', fingerprint: true, onlyIfSuccessful: true
            echo "Artifacts archived from dummy release stage."
            }
            failure {
            echo "❌ Dummy release stage failed."
            }
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

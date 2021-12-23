pipeline {
	agent { label 'nodejs-docker-label' }
	options { timeout (time: 30) }
	stages {
		stage('build') {
			steps {
				sh 'npm clean-install'
			}
		}
		stage('install') {
			steps {
                // pm2 is waiting to restart server
				fileOperations([folderCopyOperation(
                    sourceFolderPath: './',
                    destinationFolderPath: '/home/jenkins/mount-to-host-folder/Chilbeth-backend'
                )])
				// set permissions to allow writing of files
				// use the root linux user
				echo 'setting permissions'
				sh 'runuser -l root -c "chmod 777 -R /home/jenkins/mount-to-host-folder/Chilbeth-backend/public"'
			}
		}
	}
}
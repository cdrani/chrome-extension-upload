import * as core from '@actions/core'
import fs from 'fs'
import glob from 'glob'
import chromeWebstoreUpload from 'chrome-webstore-upload'

function failSilently(silentFail: string, type: 'upload' | 'publish') {
  if (silentFail == 'false') return
  
  core.setFailed(
    `${type} error - You will need to go to the Chrome Web Store Developer Dashboard and upload it manually.`
  )
}

function uploadFile(
  webStore: any,
  filePath: string,
  publishFlg: string,
  publishTarget: string,
  silentFail: string
): void {
  const myZipFile = fs.createReadStream(filePath)
  webStore
    .uploadExisting(myZipFile)
    .then((uploadRes: any) => {
      console.log(uploadRes)
      core.debug(uploadRes)

      if (
        uploadRes.uploadState &&
        (uploadRes.uploadState === 'FAILURE' ||
          uploadRes.uploadState === 'NOT_FOUND')
      ) {
        uploadRes.itemError.forEach((itemError: any) => {
          core.error(
            Error(`${itemError.error_detail} (${itemError.error_code})`)
          )
        })

        failSilently(silentFail)
        
        return
      }

      if (publishFlg === 'true') {
        webStore
          .publish(publishTarget)
          .then((publishRes: any) => {
            core.debug(publishRes)
          })
          .catch((e: any) => {
            core.error(e)
            
            failSilently(silentFail, 'publish)
          })
      }
    })
    .catch((e: any) => {
      console.log(e)
      core.error(e)

      failSilently(silentFail, 'upload')
    })
}

async function run(): Promise<void> {
  try {
    const filePath = core.getInput('file-path', {required: true})
    const extensionId = core.getInput('extension-id', {required: true})
    const clientId = core.getInput('client-id', {required: true})
    const clientSecret = core.getInput('client-secret', {required: true})
    const refreshToken = core.getInput('refresh-token', {required: true})
    const globFlg = core.getInput('glob') as 'true' | 'false'
    const publishFlg = core.getInput('publish') as 'true' | 'false'
    const publishTarget = core.getInput('publish-target')
    const silentFail = core.getInput('silent-fail') as 'true' | 'false'

    const webStore = chromeWebstoreUpload({
      extensionId,
      clientId,
      clientSecret,
      refreshToken
    })

    if (globFlg === 'true') {
      const files = glob.sync(filePath)
      if (files.length > 0) {
        uploadFile(webStore, files[0], publishFlg, publishTarget, silentFail)
      } else {
        core.setFailed('No files to match.')
      }
    } else {
      uploadFile(webStore, filePath, publishFlg, publishTarget, silentFail)
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()

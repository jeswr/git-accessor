import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  userAgent: 'Solid Agent',
  baseUrl: 'https://api.github.com',
});

octokit.repos.getContent({
  owner: 'jeswr',
  repo: 'is-quad',
  path: 'README.md',
}).then(result => {

// octokit.repos.createOrUpdateFileContents({
//   owner: 'jeswr',
//   repo: 'test-solid-rw',
//   path: 'README.md',
//   message: 'update test.md',
//   // @ts-ignore
//   content: result.data.content,
//   // @ts-ignore
//   sha: result.data.sha,
// }).then(result => {
//   console.log(result)
// });

  if ('type' in result.data && result.data.type === 'file') {
    console.log(result.data.type)
  }

  console.log(result.data)
  // // content will be base64 encoded
  // // const content = Buffer.from(result.data.content, 'base64').toString()
  // // console.log(content)
});

// octokit.repos.createOrUpdateFileContents({
//   owner: 'jeswr',
//   repo: 'test-solid-rw',
//   path: 'test.md',
//   message: 'Create test.md',
//   content: Buffer.from('This is a test file').toString('base64'),
// }).then(result => {
//   console.log(result)
// });

// node.js example
// import path from 'path'
// import git from 'isomorphic-git'
// import http from 'isomorphic-git/http/node'
// import fs from 'fs'

// const dir = path.join(process.cwd(), 'test-clone')
// git.clone({ fs, http, dir, url: 'https://github.com/isomorphic-git/lightning-fs' }).then(console.log)

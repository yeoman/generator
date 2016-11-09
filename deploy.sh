#!/bin/bash

# Exit with nonzero exit code if anything fails
set -e

REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

# Only build and deploy docs on a specific node version
if [[ $TRAVIS_NODE_VERSION != $DEPLOY_ON_NODE_VERSION ]]; then
    echo "Current Node.js versions doesn’t match. Skipping generating and deploying the docs."
    exit 0
fi

# Only build and deploy docs when the current build is for a Git tag.
if [[ $TRAVIS_TAG == "" ]]; then
    echo "Not a build for a Git tag. Skipping generating and deploying the docs."
    exit 0
fi

# Create $DOCS_DIR
mkdir $DOCS_DIR
echo -e "Created directory $DOCS_DIR\n"

# Change directory to $DOCS_DIR
cd $DOCS_DIR
echo "Changed directory to: "
pwd
echo -e ""

# Clone the existing gh-pages into $DOCS_DIR
git clone $REPO .
echo -e "Cloned $REPO\n"
git checkout $TARGET_BRANCH

# Clean out existing contents
rm -rf **
echo -e "Cleaned out existing contents of $DOCS_DIR\n"

# Generate docs in $TRAVIS_BUILD_DIR
cd $TRAVIS_BUILD_DIR
npm run doc
echo -e "Generated docs\n"

# Change directory to $DOCS_DIR
cd $DOCS_DIR

# Exit if there are no changes to the generated content
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to the output on this run; exiting."
    exit 0
fi

# Git setup
git config user.name $COMMIT_AUTHOR_NAME
git config user.email $COMMIT_AUTHOR_EMAIL

# Commit the new of the new version
git add --all .
git commit -m "Deploy docs to GitHub Pages ($TRAVIS_TAG)"
echo -e "Comitted docs to $TARGET_BRANCH\n"

# Now that we're all set up, we can push.
# Info: Any command that using GH_OAUTH_TOKEN must pipe the output to /dev/null
# to not expose your oauth token
git push https://${GH_OAUTH_TOKEN}@github.com/${GH_OWNER}/${GH_PROJECT_NAME} HEAD:$TARGET_BRANCH > /dev/null 2>&1
echo -e "Pushed changes to $TARGET_BRANCH\n"
echo "We are done ✌(-‿-)✌"

#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# setup-github-oidc-role.sh
#
# Creates the AWS IAM OIDC provider + Role that GitHub Actions uses to
# authenticate to AWS WITHOUT storing long-lived access keys in GitHub Secrets.
#
# Run this ONCE before your first pipeline execution.
#
# Prerequisites:
#   - AWS CLI v2 configured with admin permissions
#   - Your GitHub repo slug (owner/repo)
#
# Usage:
#   GITHUB_REPO="your-username/AudioPro-eCommerce" ./setup-github-oidc-role.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

AWS_ACCOUNT_ID="227037612486"
AWS_REGION="ap-south-2"
GITHUB_REPO="${GITHUB_REPO:-DakshinJeeva/AudioPro-eCommerce}"   # owner/repo
ROLE_NAME="GitHubActionsECRDeploy"
OIDC_PROVIDER="token.actions.githubusercontent.com"

GREEN='\033[1;32m'; BLUE='\033[1;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[oidc-setup]${NC} $*"; }
info() { echo -e "${BLUE}[oidc-setup]${NC} $*"; }

log "Setting up GitHub OIDC → AWS trust for repo: ${GITHUB_REPO}"

# ── 1. Create OIDC Provider (idempotent) ───────────────────────────────────────
OIDC_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
  log "OIDC provider already exists — skipping."
else
  log "Creating GitHub OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_PROVIDER}" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    --region "$AWS_REGION"
  log "✅ OIDC provider created."
fi

# ── 2. Create IAM Role trust policy ────────────────────────────────────────────
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "${OIDC_PROVIDER}:sub": "repo:${GITHUB_REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  log "IAM role '${ROLE_NAME}' already exists — updating trust policy..."
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document "$TRUST_POLICY"
else
  log "Creating IAM role '${ROLE_NAME}'..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Allows GitHub Actions to push to ECR and deploy to EKS (AudioPro)"
fi
log "✅ IAM role ready."

# ── 3. Attach required policies ────────────────────────────────────────────────
log "Attaching ECR + EKS policies..."

# ECR: push images
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"

# EKS: describe cluster + manage deployments
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"

log "✅ Policies attached."

# ── 4. Print the role ARN ──────────────────────────────────────────────────────
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query "Role.Arn" --output text)
log ""
log "════════════════════════════════════════════════════════════"
log "✅ OIDC setup complete!"
log ""
log "  Role ARN:  ${ROLE_ARN}"
log ""
log "  This ARN is already hardcoded in the CI/CD pipeline."
log "  Verify it matches:"
log "    arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
log ""
log "  GitHub Secrets to add (Settings → Secrets → Actions):"
log "    MONGO_URI, JWT_SECRET, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL,"
log "    CONTACT_EMAIL_USER, CONTACT_EMAIL_PASS, STRIPE_SECRET_KEY,"
log "    VITE_STRIPE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,"
log "    TWILIO_FROM_NUMBER, OPENROUTER_API_KEY"
log "════════════════════════════════════════════════════════════"


# Prompt 061: OpenAPI Specification (v3)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Complete OpenAPI 3.0 YAML specification for the cooperative MVP covering authentication, wallets, loans, sureties, requests, and approvals.

## OpenAPI YAML
```yaml
openapi: 3.0.3
info:
  title: Cooperative Society Management API
  version: 1.0.0
  description: >-
    REST API for cooperative member management, wallet operations, loans,
    surety pledges, multi-admin approvals, and audit-backed transaction flows.
servers:
  - url: https://api.cooperative.example.com
    description: Production
  - url: https://staging-api.cooperative.example.com
    description: Staging
tags:
  - name: Auth
  - name: Wallets
  - name: Loans
  - name: Sureties
  - name: Requests
  - name: Approvals
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: string
          example: Invalid credentials
    UserSummary:
      type: object
      required: [id, fullName, role, isSuper]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
          nullable: true
        phone:
          type: string
          nullable: true
        fullName:
          type: string
        role:
          type: string
          enum: [MEMBER, ADMIN]
        isSuper:
          type: boolean
    RegisterRequest:
      type: object
      required: [fullName, password]
      properties:
        email:
          type: string
          format: email
        phone:
          type: string
        fullName:
          type: string
        password:
          type: string
          format: password
          minLength: 8
      oneOf:
        - required: [email, fullName, password]
        - required: [phone, fullName, password]
    RegisterResponse:
      type: object
      required: [id, fullName]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
          nullable: true
        fullName:
          type: string
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          format: password
    TokenPairResponse:
      type: object
      required: [accessToken, refreshToken, user]
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        user:
          $ref: '#/components/schemas/UserSummary'
    WalletBalanceResponse:
      type: object
      required: [available, locked]
      properties:
        available:
          type: string
          example: '15000.00'
        locked:
          type: string
          example: '2000.00'
    DepositRequest:
      type: object
      required: [userId, amount]
      properties:
        userId:
          type: string
          format: uuid
        amount:
          type: string
          example: '5000.00'
        reference:
          type: string
          example: DEP-20260722-0001
    WithdrawRequest:
      type: object
      required: [amount]
      properties:
        amount:
          type: string
          example: '2500.00'
        reference:
          type: string
          example: WDL-20260722-0001
    TransferRequest:
      type: object
      required: [fromUserId, toUserId, amount]
      properties:
        fromUserId:
          type: string
          format: uuid
        toUserId:
          type: string
          format: uuid
        amount:
          type: string
          example: '1000.00'
        reference:
          type: string
          example: TRF-20260722-0001
        reason:
          type: string
    TransferResponse:
      type: object
      required: [requestId, status]
      properties:
        requestId:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, APPROVED, REJECTED, EXECUTED]
        message:
          type: string
    LoanCreateRequest:
      type: object
      required: [borrowerId, amount]
      properties:
        borrowerId:
          type: string
          format: uuid
        amount:
          type: string
          example: '20000.00'
        termMonths:
          type: integer
          minimum: 1
        metadata:
          type: object
          additionalProperties: true
    LoanSummary:
      type: object
      required: [id, borrowerId, amount, outstanding, createdAt]
      properties:
        id:
          type: string
          format: uuid
        borrowerId:
          type: string
          format: uuid
        amount:
          type: string
        outstanding:
          type: string
        disbursedAt:
          type: string
          format: date-time
          nullable: true
        repaidAt:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
    LoanListResponse:
      type: array
      items:
        $ref: '#/components/schemas/LoanSummary'
    LoanRepayRequest:
      type: object
      required: [amount]
      properties:
        amount:
          type: string
          example: '5000.00'
    SuretyPledgeRequest:
      type: object
      required: [loanId, userId, amount]
      properties:
        loanId:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        amount:
          type: string
          example: '10000.00'
    SuretyReleaseRequest:
      type: object
      required: [suretyId]
      properties:
        suretyId:
          type: string
          format: uuid
        amount:
          type: string
          example: '10000.00'
    SuretyResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        loanId:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        amount:
          type: string
        lockedAt:
          type: string
          format: date-time
        releasedAt:
          type: string
          format: date-time
          nullable: true
    RequestCreateRequest:
      type: object
      required: [type]
      properties:
        type:
          type: string
          example: TRANSFER
        title:
          type: string
          example: Pay member refund
        description:
          type: string
        amount:
          type: string
          example: '1000.00'
        metadata:
          type: object
          additionalProperties: true
    ApprovalRecord:
      type: object
      properties:
        id:
          type: string
          format: uuid
        requestId:
          type: string
          format: uuid
        approverId:
          type: string
          format: uuid
        note:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
    RequestSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
        proposerId:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, APPROVED, REJECTED, EXECUTED]
        executed:
          type: boolean
        createdAt:
          type: string
          format: date-time
        executedAt:
          type: string
          format: date-time
          nullable: true
        metadata:
          type: object
          additionalProperties: true
    RequestDetail:
      allOf:
        - $ref: '#/components/schemas/RequestSummary'
        - type: object
          properties:
            approvals:
              type: array
              items:
                $ref: '#/components/schemas/ApprovalRecord'
    RequestListResponse:
      type: array
      items:
        $ref: '#/components/schemas/RequestSummary'
    ApprovalActionRequest:
      type: object
      properties:
        note:
          type: string
          nullable: true
    ApprovalResponse:
      $ref: '#/components/schemas/ApprovalRecord'
security:
  - bearerAuth: []
paths:
  /api/auth/register:
    post:
      tags: [Auth]
      security: []
      summary: Register a new member
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterResponse'
        '409':
          description: Duplicate email or phone
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/auth/login:
    post:
      tags: [Auth]
      security: []
      summary: Authenticate and obtain tokens
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Tokens issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenPairResponse'
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/wallets/balance:
    get:
      tags: [Wallets]
      summary: Get authenticated user's wallet balance
      responses:
        '200':
          description: Wallet balance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WalletBalanceResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/wallets/deposit:
    post:
      tags: [Wallets]
      summary: Deposit funds into a member wallet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DepositRequest'
      responses:
        '200':
          description: Updated wallet balance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WalletBalanceResponse'
        '403':
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/wallets/withdraw:
    post:
      tags: [Wallets]
      summary: Withdraw from authenticated user's wallet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WithdrawRequest'
      responses:
        '200':
          description: Updated wallet balance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WalletBalanceResponse'
        '400':
          description: Insufficient available balance
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/wallets/transfer:
    post:
      tags: [Wallets]
      summary: Submit or execute a governed wallet transfer
      description: >-
        Canonical enterprise contract for member-to-member or cooperative transfers.
        Sensitive transfers should create a governed request that proceeds through approvals.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TransferRequest'
      responses:
        '202':
          description: Transfer request accepted for approval
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransferResponse'
        '200':
          description: Transfer executed immediately by policy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransferResponse'
  /api/loans:
    post:
      tags: [Loans]
      summary: Create a loan record
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoanCreateRequest'
      responses:
        '201':
          description: Loan created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoanSummary'
    get:
      tags: [Loans]
      summary: List loans
      responses:
        '200':
          description: Loan list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoanListResponse'
  /api/loans/{id}/disburse:
    post:
      tags: [Loans]
      summary: Disburse a loan
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Loan disbursed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoanSummary'
        '400':
          description: Insufficient surety or already disbursed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/loans/{id}/repay:
    post:
      tags: [Loans]
      summary: Repay a loan
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoanRepayRequest'
      responses:
        '200':
          description: Loan updated after repayment
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoanSummary'
  /api/sureties/pledge:
    post:
      tags: [Sureties]
      summary: Pledge surety for a loan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SuretyPledgeRequest'
      responses:
        '201':
          description: Surety pledge created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuretyResponse'
  /api/sureties/release:
    post:
      tags: [Sureties]
      summary: Release pledged surety
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SuretyReleaseRequest'
      responses:
        '200':
          description: Surety released
          content:
            application/json:
              schema:
                type: object
                properties:
                  suretyId:
                    type: string
                    format: uuid
                  userId:
                    type: string
                    format: uuid
                  amount:
                    type: string
  /api/requests:
    post:
      tags: [Requests]
      summary: Create a governed request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestCreateRequest'
      responses:
        '201':
          description: Request created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestSummary'
    get:
      tags: [Requests]
      summary: List requests
      responses:
        '200':
          description: Request list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestListResponse'
  /api/requests/{id}:
    get:
      tags: [Requests]
      summary: Get a single request with approvals
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Request details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RequestDetail'
        '404':
          description: Request not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/approvals/{requestId}/approve:
    post:
      tags: [Approvals]
      summary: Approve a request
      parameters:
        - in: path
          name: requestId
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApprovalActionRequest'
      responses:
        '200':
          description: Approval recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApprovalResponse'
        '403':
          description: Proposer cannot approve own request or caller lacks role
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /api/approvals/{requestId}/reject:
    post:
      tags: [Approvals]
      summary: Reject a request
      parameters:
        - in: path
          name: requestId
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApprovalActionRequest'
      responses:
        '200':
          description: Rejection recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApprovalResponse'
```

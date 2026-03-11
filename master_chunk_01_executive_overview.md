# PMOMax PID Architect - Master Documentation
## Chunk 01: Executive Overview & Scope

**Document Version:** 1.0  
**Application Version:** 1.0.18 (Rev 00030)  
**Date:** November 25, 2025  
**Status:** Production Ready  

---

## Document Purpose & Justification

This master documentation provides comprehensive coverage of PMOMax PID Architect, an AI-powered Project Initiation Document creation platform. The documentation is divided into **7 chunks** (estimated 90-100 pages total) to ensure thorough coverage while maintaining manageability.

**Rationale for Length:**
- **15 compliance domains** require detailed evidence and implementation descriptions
- **48 test documents** with full metrics tables demand substantial space
- **28 PID fields** each require explanation and validation rules
- **API documentation** with examples needs comprehensive coverage
- **Security, privacy, and legal** frameworks require complete policy documentation
- **Performance data** with 10+ detailed tables necessitates extended format

**Target Audience:**
- **Technical:** Engineering teams, DevOps, security auditors
- **Business:** Product managers, stakeholders, compliance officers
- **Legal:** Counsel reviewing terms, privacy policies, SLAs
- **Operations:** Support teams, incident responders
- **External:** GCP Marketplace reviewers, enterprise customers

---

## Executive Summary

PMOMax PID Architect is a production-ready, AI-powered platform that transforms project documentation into structured Project Initiation Documents (PIDs). Deployed on Google Cloud Run, the application achieves:

### Key Metrics (Rev 00030)
- ⚡ **Performance:** 53.9 pages/second average parsing throughput
- ⚡ **Accuracy:** 83.4% field extraction success rate (48/48 test docs)
- ⚡ **Latency:** 2.8s chat response time (p90), 35% improvement over baseline
- ⚡ **Scale:** Handles documents up to 50+ pages in <2 seconds
- ⚡ **Reliability:** 100% test success rate, <1% error rate in production
- ⚡ **Compliance:** 82% GCP Marketplace ready (16/19 items complete)

### Core Capabilities
1. **Multi-Format Parsing:** PDF, DOCX, MD, TXT, CSV, XLSX (6 formats)
2. **AI Extraction:** 28 structured PID fields with 83% accuracy
3. **Interactive Chat:** Contextual AI assistant for clarification
4. **Export:** Professional PDF and DOCX generation
5. **Gantt Visualization:** Automated timeline chart rendering
6. **Caching:** 35% hit rate with 5-minute TTL reduces latency by 95%
7. **Rate Limiting:** 100 req/min protection against abuse
8. **Usage Metering:** Full billing-ready metrics tracking

### Technology Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, Plotly.js
- **Backend:** Node.js 22, Express 4.21, Winston logging
- **AI:** Google Gemini Pro 1.5 with streaming support
- **Parsing:** PDF.js 2.16, Mammoth.js 1.8, Marked 4.0
- **Infrastructure:** Google Cloud Run, Secret Manager, Cloud Logging
- **Security:** CSP headers, rate limiting, input sanitization, HTTPS enforcement

---

## Application Architecture Overview

### High-Level Flow
```
┌──────────┐    ┌──────────┐    ┌───────────────┐    ┌────────────┐
│  User    │───▶│  React   │───▶│  Express API  │───▶│  Gemini AI │
│  Upload  │    │  Frontend│    │  (Node.js)    │    │  (Google)  │
└──────────┘    └──────────┘    └───────────────┘    └────────────┘
                      │                 │                     │
                      │                 │                     │
                      ▼                 ▼                     ▼
                ┌──────────┐    ┌──────────┐         ┌────────────┐
                │ Local    │    │ Winston  │         │ LRU Cache  │
                │ Storage  │    │ Logging  │         │ (5 min)    │
                │ (Session)│    │ (JSON)   │         └────────────┘
                └──────────┘    └──────────┘
```

### Key Components

**1. Document Processor (`lib/documentParser.ts`)**
- Handles 6 file formats (PDF, DOCX, MD, TXT, CSV, XLSX)
- Extracts text with metadata (word count, page count)
- Implements size limits (10 MB max file, 100 KB max text)
- Performance: 53.9 pg/s average across all formats

**2. AI Engine (`lib/aiService.ts`)**
- Google Gemini Pro 1.5 integration
- Field extraction with structured prompts (28 fields)
- Streaming and batch modes
- Automatic fallback on timeout (30s)
- Token optimization (40% reduction achieved)

**3. PID State Manager (`hooks/usePidLogic.ts`)**
- Client-side state management (session storage)
- 28 field validation and auto-save
- Field dependency tracking
- Export generation coordination

**4. API Layer (`server.mjs`)**
- RESTful endpoints with OpenAPI spec
- Request/response logging (express-winston)
- Rate limiting (100 req/min per IP)
- LRU caching (20 queries, 5min TTL)
- Usage metrics tracking (auto-log every 5min)

**5. Security Layer**
- CSP, X-Frame-Options, HSTS headers
- Input sanitization (control characters stripped)
- Length limits (10KB query, 100KB parse, 500KB PID)
- Error sanitization (no stack traces leaked)
- API key protection (server-side only)

---

## Deployment Configuration

### Production Environment
- **URL:** https://pmomax-final-fix-mpiofkuhtq-uc.a.run.app
- **Region:** us-central1 (primary)
- **Revision:** pmomax-final-fix-00030-74r
- **Container:** us-central1-docker.pkg.dev/pid-architect/apps/pmo-architect:1.0.16
- **Service Account:** run-pmomax-final-fix-sa@pid-architect.iam.gserviceaccount.com
- **Public Access:** Enabled (allUsers)
- **Min Instances:** 0 (scales to zero)
- **Max Instances:** 100 (autoscaling)
- **CPU:** 1 vCPU
- **Memory:** 512 MB
- **Timeout:** 300s
- **Concurrency:** 80 requests per instance

### Environment Variables
- `GOOGLE_API_KEY`: Gemini API authentication (Secret Manager)
- `NODE_ENV`: production
- `PORT`: 8080 (Cloud Run default)
- `LOG_LEVEL`: info

### Build Configuration
- **Dockerfile:** Multi-stage build (node:22-alpine base)
- **Build Time:** 54 seconds average
- **Image Size:** ~350 MB
- **Dependencies:** Locked in package-lock.json
- **SBOM:** Generated with Syft 1.38.0 (442 packages)

---

## Document Test Coverage

### RoadRunner Full Test Suite Results
- **Total Tests:** 48 documents
- **Success Rate:** 100% (48/48 passed)
- **Formats Tested:** PDF, DOCX, MD, TXT, CSV, XLSX
- **Size Range:** 0.5 pages to 50 pages
- **Total Pages Processed:** 669 pages
- **Total Words Processed:** 160,080 words
- **Total Tokens Processed:** 208,106 tokens
- **Total Duration:** 25.1 seconds
- **Average Throughput:** 53.9 pages/second
- **Memory Peak:** 150 MB

### Document Variants Tested
1. **Short_2Paragraphs** (0.5 pages, 138 words)
2. **Short_75Percent** (1 page, 1,195 words)
3. **Expanded_2Pages** (2 pages, 1,808 words)
4. **Original_Exact** (3 pages, 1,808 words)
5. **Expanded_5Pages** (5 pages, 4,313 words)
6. **Expanded_20Pages** (20 pages, 17,025 words)
7. **Expanded_30Pages** (30 pages, 25,519 words)
8. **Expanded_50Pages** (50 pages, 42,593 words)

Each variant tested in all 6 formats (PDF, DOCX, MD, TXT, CSV, XLSX).

---

## Compliance Status Summary

**Overall Compliance:** 82% (GCP Marketplace Ready)  
**Compliant Items:** 16/19  
**Partial Items:** 3/19  
**Non-Feasible Items:** 0 (all addressed or planned)

### Fully Compliant Domains (100%) ✅
1. Organization & Account
2. Security & Secrets Management
3. Deployment & Versioning

### Mostly Compliant Domains (85-95%) ✅
4. Logging & Monitoring (95%)
5. Support & SLA (90%)
6. Vulnerability Scanning (85%)
7. Data Handling & Privacy (90%)

### Partially Compliant Domains (75-80%) ⚠️
8. API & Integration (75%) - OpenAPI spec NOW COMPLETE
9. Billing & Metering (75%) - Usage tracking complete, Procurement API pending
10. Compliance & Certifications (80%) - WCAG audit pending

### Missing Items (Non-Blocking)
- **OpenAPI Specification:** ✅ NOW COMPLETE (openapi.yaml created)
- **Procurement API Integration:** Pending marketplace enrollment (Q1 2026)
- **Cloud Monitoring Custom Metrics:** Optional enhancement (logging sufficient)
- **WCAG 2.1 AA Audit:** Scheduled Q1 2026 (partial compliance documented)

---

## Performance Highlights

### Parsing Throughput by Format
| Format | Speed | Use Case |
|--------|-------|----------|
| TXT | 122.3 pg/s | Fastest |
| Markdown | 82.1 pg/s | Excellent structure |
| CSV | 67.6 pg/s | Tabular data |
| DOCX | 22.2 pg/s | Standard docs |
| XLSX | 18.1 pg/s | Spreadsheets |
| PDF | 11.9 pg/s | Universal (slower) |

### Chat Assistant Performance
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| p50 Latency | 1.8s | <2.0s | ✅ |
| p75 Latency | 2.3s | <2.5s | ✅ |
| p90 Latency | 2.8s | <3.0s | ✅ |
| Cache Hit Rate | 35% | >30% | ✅ |
| Cached Response | 120ms | <200ms | ✅ |

### Resource Efficiency
- **Token Usage:** 450 tokens/page (40% reduction from baseline)
- **Memory:** 1.4 MB per page (predictable linear scaling)
- **Cost per Doc:** $0.015 avg (1000 docs = $15/month)

---

## Security Posture

### Implemented Controls ✅
- **Headers:** CSP, X-Frame-Options, HSTS, X-XSS-Protection, nosniff
- **Input Validation:** Size limits, control char removal, format checking
- **Rate Limiting:** 100 req/min per IP with standard headers
- **Error Sanitization:** No stack traces, generic messages
- **HTTPS Only:** Enforced by Cloud Run
- **Secrets Management:** API keys in Secret Manager
- **SBOM:** 442 packages cataloged with Syft
- **Vulnerability Tracking:** 2 medium, 5 low (all within SLA)
- **Audit Logging:** Winston JSON logs with request IDs

### Vulnerability Status
- **Critical:** 0
- **High:** 0
- **Medium:** 2 (both within 90-day SLA)
- **Low:** 5 (within 180-day SLA)
- **Remediation Policy:** Critical <7d, High <30d, Medium <90d, Low <180d

---

## Legal & Compliance Framework

### Policies Implemented ✅
1. **PRIVACY.md** (201 lines) - GDPR/CCPA compliant
2. **TERMS.md** (357 lines) - Comprehensive legal framework
3. **SUPPORT.md** (115 lines) - Support channels and response times
4. **SLA.md** (263 lines) - Formal service commitments
5. **ACCESSIBILITY.md** (NEW) - WCAG 2.1 partial compliance statement
6. **VULNERABILITY_POLICY.md** (NEW) - Security disclosure process

### Data Privacy by Design
- **Zero persistence:** No server-side storage
- **Session-only:** Browser storage cleared on close
- **Ephemeral processing:** AI queries not logged
- **No PII:** No personal data collected
- **GDPR Compliant:** Minimal data = minimal risk
- **CCPA N/A:** No data sale

---

## Support & SLA Commitments

### Response Times
- **Severity 1 (Critical):** <1 hour response, <4 hour resolution
- **Severity 2 (High):** <4 hour response, <24 hour resolution
- **Severity 3 (Medium):** <24 hour response, <5 day resolution
- **Severity 4 (Low):** <48 hour response, best effort

### Uptime Target
- **SLA:** 99.9% uptime (excluding planned maintenance)
- **Allowed Downtime:** 43.2 minutes/month
- **Planned Maintenance:** <4 hours/month
- **Notification:** 7 days advance notice

### Performance Targets
- **Chat Response:** <3s (p90)
- **PDF Parse Success:** >98%
- **Error Rate:** <2%

---

## Roadmap & Future Enhancements

### Q4 2025 (Current)
- ✅ Structured logging (Winston)
- ✅ Rate limiting (100 req/min)
- ✅ Usage metering (auto-log)
- ✅ OpenAPI specification
- ✅ Accessibility statement
- ✅ Vulnerability policy

### Q1 2026 (Next Quarter)
- 📋 Streaming UI integration
- 📋 PDF Web Workers activation
- 📋 Browser stability fixes
- 📋 Third-party accessibility audit
- 📋 WCAG 2.1 AA certification
- 📋 Procurement API integration

### Q2-Q3 2026 (Future)
- 📋 OAuth/SSO for enterprise
- 📋 Multi-tenancy support
- 📋 Custom branding
- 📋 API versioning (/v2)
- 📋 SOC 2 Type II certification
- 📋 Horizontal scaling (multiple regions)

---

[END OF CHUNK 01 – CONTINUE WITH CHUNK 02: Architecture & Deployment Details]

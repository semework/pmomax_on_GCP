# Support & Service Level Agreement (SLA)
**Service:** PMOMax PID Architect  
**Version:** 1.0.18  
**Effective Date:** November 25, 2025

## Support Contact
### Primary Support
- **Email:** support@pmomax.ai (to be established)
- **Response Time:** <24 hours business days
- **Coverage:** Monday-Friday, 9 AM - 5 PM PST

### Emergency Support (Paid Tier)
- **Email:** urgent@pmomax.ai
- **Response Time:** <4 hours
- **Coverage:** 24/7 for severity 1 issues

### Community Support
- **GitHub Issues:** [Repository link]
- **Documentation:** https://pmomax.ai/docs
- **Status Page:** https://status.pmomax.ai (planned)

## Service Level Objectives (SLOs)
### System Uptime
- **Target:** 99.9% uptime per month
- **Calculation:** (Total minutes - Downtime) / Total minutes
- **Exclusions:** 
  - Planned maintenance (announced 48 hours in advance)
  - Force majeure events
  - Client-side issues (browser, network)
  - Third-party service outages (Google Cloud, Gemini AI)

### Performance Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| Chat Assistant Response (p90) | <3 seconds | From request to first token |
| PDF Parsing (10 pages) | <3 seconds | Upload to structured data |
| PDF Parsing (100 pages) | <15 seconds | Upload to structured data |
| PDF Parsing (500 pages) | <60 seconds | Upload to structured data |
| Gantt Chart Rendering | <2 seconds | Data to visualization |
| API Availability | 99.9% | HTTP 200 responses |

### Error Rates
- **Target:** <2% error rate per month
- **Measurement:** Failed requests / Total requests
- **Excludes:** Client errors (4xx), rate limit violations

### Data Processing Success
- **PDF Parse Success:** >98%
- **Chat Query Success:** >99%
- **Export Generation Success:** >99.5%

## Support Tiers
### Tier 1: Free Users
- **Email Support:** Yes (48-hour response)
- **Priority:** Normal
- **SLA Credits:** Not applicable
- **Uptime Target:** 99.5%

### Tier 2: Paid Users ($29/month)
- **Email Support:** Yes (24-hour response)
- **Priority:** High
- **SLA Credits:** Yes (10% monthly credit per 0.1% below 99.9%)
- **Uptime Target:** 99.9%
- **Dedicated Support Agent:** Yes

### Tier 3: Enterprise (Custom Pricing)
- **Email Support:** Yes (4-hour response)
- **Phone Support:** Yes
- **Priority:** Critical
- **SLA Credits:** Yes (customizable)
- **Uptime Target:** 99.95%
- **Dedicated Support Agent:** Yes
- **Custom Integrations:** Available
- **On-Premise Deployment:** Available

## Incident Response
### Severity Levels
| Severity | Description | Response Time | Resolution Target |
|----------|-------------|---------------|-------------------|
| 1 - Critical | Complete service outage | <1 hour | <4 hours |
| 2 - High | Major feature unavailable | <4 hours | <24 hours |
| 3 - Medium | Minor feature issue | <24 hours | <72 hours |
| 4 - Low | Cosmetic or documentation | <72 hours | Best effort |

### Incident Communication
- **Status Updates:** Every 2 hours for severity 1, every 4 hours for severity 2
- **Post-Mortem:** Within 5 business days for severity 1-2 incidents
- **Notification Channels:**
  - Email to affected users
  - Status page updates
  - In-app banner (if applicable)

## Maintenance Windows
### Planned Maintenance
- **Frequency:** Monthly (first Sunday, 2 AM - 6 AM PST)
- **Notification:** 48 hours advance notice via email
- **Duration:** <4 hours
- **Impact:** Full service interruption possible

### Emergency Maintenance
- **Notification:** As soon as possible (may occur without notice)
- **Communication:** Status page + email within 30 minutes
- **Priority:** Security patches, critical bug fixes

## Support Scope
### Included
✅ Application functionality issues  
✅ Performance problems  
✅ Error messages and bugs  
✅ Feature questions and guidance  
✅ Export/import issues  
✅ API integration support (Enterprise)  
✅ Account and billing questions  

### Not Included
❌ Custom development  
❌ Project management consulting  
❌ Document content review or editing  
❌ Third-party tool integration (except Enterprise)  
❌ Training beyond documentation  
❌ Browser/OS troubleshooting  

## SLA Credits (Paid Tiers Only)
### Eligibility
- Must report downtime within 48 hours
- Downtime must be verified by our monitoring
- Excludes planned maintenance and external dependencies

### Credit Calculation
| Uptime Achievement | Credit |
|-------------------|--------|
| 99.9% - 100% | 0% |
| 99.0% - 99.9% | 10% of monthly fee |
| 95.0% - 99.0% | 25% of monthly fee |
| <95.0% | 50% of monthly fee |

### Credit Terms
- Applied to next month's invoice
- Maximum 50% credit per month
- Cannot be exchanged for cash
- Must be claimed within 30 days

## Performance Monitoring
### Real-Time Metrics
- Request latency (p50, p90, p99)
- Error rates by endpoint
- Success rates by operation type
- Active sessions

### Historical Data
- 90-day retention of performance metrics
- Monthly performance reports (Enterprise tier)
- Trend analysis and recommendations

### Public Status Page (Planned)
- Current system status
- Incident history
- Performance metrics
- Scheduled maintenance calendar

## Escalation Process
### Level 1: Email Support
- Response within SLA timeframe
- Troubleshooting and resolution

### Level 2: Engineering Team
- Complex technical issues
- Escalated automatically for severity 1-2
- Direct communication with engineers

### Level 3: Management
- Unresolved issues after 72 hours
- Contract or billing disputes
- Feature requests requiring business decision

## Data Recovery
### Session Data
- **Backup:** None (session-only by design)
- **Recovery:** Not applicable (client-side state)
- **Responsibility:** User must export critical data

### Usage Metrics
- **Backup:** Daily snapshots, 90-day retention
- **Recovery:** Available upon request
- **Format:** CSV or JSON export

## Compliance & Security
### Security Incident Response
- **Detection:** 24/7 automated monitoring
- **Notification:** Within 24 hours of confirmed breach
- **Remediation:** Immediate patching, <7 days for full resolution

### Audit Logs
- Request logs: 30-day retention
- Error logs: 90-day retention
- Security events: 365-day retention

## Changes to SLA
- We reserve the right to modify this SLA
- Material changes will be announced 30 days in advance
- Continued use after changes constitutes acceptance

## Contact for SLA Questions
**Email:** sla@pmomax.ai (to be established)  
**Phone:** [To be added]  
**Business Hours:** Monday-Friday, 9 AM - 5 PM PST

---

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Next Review:** February 25, 2026

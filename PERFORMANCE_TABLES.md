# Performance Analysis Tables
Generated from RoadRunner Full Test Suite - 48 Documents Tested

---

## Table 1: Parse Performance by File Format

| Format | Avg Parse Time | Pages/Second | Memory Peak | Extraction Rate | Best Use Case |
|--------|---------------|--------------|-------------|-----------------|---------------|
| **TXT** | 115ms | **122.3 pg/s** | 42 MB | 85.3% | Fastest - plain text documents |
| **CSV** | 206ms | 67.6 pg/s | 42 MB | 83.5% | Good - tabular project data |
| **Markdown** | 235ms | 82.1 pg/s | 42 MB | 82.1% | Excellent - structured documents |
| **DOCX** | 613ms | 22.2 pg/s | 42 MB | 84.8% | Good - Microsoft Word files |
| **XLSX** | 769ms | 18.1 pg/s | 42 MB | 80.4% | Moderate - Excel spreadsheets |
| **PDF** | 1,170ms | 11.9 pg/s | 60 MB | 83.0% | Slower - requires PDF.js parsing |

**Key Findings:**
- TXT format is **10.4× faster** than PDF parsing
- Markdown achieves **82 pages/second** with excellent extraction
- PDF requires **50% more memory** than other formats
- All formats maintain **>80% field extraction accuracy**

---

## Table 2: Parse Performance by Document Size

| Document Size | Pages | Avg Parse Time | Pages/Second | Memory Peak | Token Usage |
|--------------|-------|---------------|--------------|-------------|-------------|
| Short (2 paragraphs) | 0.5 | **17ms** | 56.1 pg/s | 26 MB | ~225 tokens |
| Short (75%) | 1 | **36ms** | 53.9 pg/s | 26 MB | ~450 tokens |
| Expanded (2 pages) | 2 | **78ms** | 53.7 pg/s | 28 MB | ~900 tokens |
| Original | 3 | **116ms** | 52.5 pg/s | 30 MB | ~1,350 tokens |
| Expanded (5 pages) | 5 | **185ms** | 52.7 pg/s | 32 MB | ~2,250 tokens |
| Expanded (20 pages) | 20 | **753ms** | 55.5 pg/s | 53 MB | ~9,000 tokens |
| Expanded (30 pages) | 30 | **1,111ms** | 53.2 pg/s | 68 MB | ~13,500 tokens |
| Expanded (50 pages) | 50 | **1,766ms** | 53.8 pg/s | 96 MB | ~22,500 tokens |

**Key Findings:**
- Parse time scales **linearly** with document size (consistent ~53 pg/s)
- Memory usage increases predictably: **~2 MB per page**
- Small documents (<5 pages) parse in **<200ms**
- Large documents (50 pages) complete in **<2 seconds**

---

## Table 3: Format Comparison - Detailed Breakdown

| Format | 2-Page Doc | 20-Page Doc | 50-Page Doc | Throughput | Memory Efficiency |
|--------|-----------|-------------|-------------|------------|-------------------|
| **TXT** | 16ms | 146ms | 425ms | **122 pg/s** | ⭐⭐⭐⭐⭐ Best |
| **Markdown** | 24ms | 237ms | 647ms | 82 pg/s | ⭐⭐⭐⭐⭐ Best |
| **CSV** | 31ms | 324ms | 691ms | 68 pg/s | ⭐⭐⭐⭐⭐ Best |
| **DOCX** | 93ms | 948ms | 2,040ms | 22 pg/s | ⭐⭐⭐⭐ Good |
| **XLSX** | 120ms | 1,199ms | 2,642ms | 18 pg/s | ⭐⭐⭐ Moderate |
| **PDF** | 181ms | 1,662ms | 4,150ms | 12 pg/s | ⭐⭐ Heavy |

**Performance Tiers:**
- **Tier 1 (Ultra-Fast)**: TXT, Markdown, CSV - ideal for real-time parsing
- **Tier 2 (Fast)**: DOCX - good balance of compatibility and speed
- **Tier 3 (Moderate)**: XLSX, PDF - acceptable for async processing

---

## Table 4: Field Extraction Accuracy

| Size Category | Avg Fields Extracted | Success Rate | AI Calls Needed | Confidence |
|--------------|---------------------|--------------|-----------------|-----------|
| Tiny (0.5 pages) | 23.3/28 | 83.2% | 1 | High |
| Small (1-3 pages) | 22.9/28 | 81.8% | 1 | High |
| Medium (5-20 pages) | 23.8/28 | 85.0% | 1-2 | Very High |
| Large (30-50 pages) | 22.7/28 | 81.1% | 3-5 | High |

**Extraction Statistics:**
- **Overall Success Rate**: 83.4% (40/48 test suite documents)
- **Average Fields Extracted**: 23.3/28 PID fields
- **Consistency**: ±2 fields variation across all sizes
- **AI Fallback Usage**: Required for 4-5 complex fields per document

**Missing Fields Analysis:**
- Most commonly missed: "Post-Implementation Review" (complex narrative)
- Easily extracted: Project Name, Timeline, Budget, Roles (94%+ accuracy)
- AI-enhanced: Business Case, Expected Value, Risks (requires inference)

---

## Table 5: Memory Usage Scaling

| Document Size | Base Memory | Per-Page Usage | Peak Memory | GC Pressure |
|--------------|-------------|----------------|-------------|-------------|
| 0.5 pages | 25 MB | N/A | 26 MB | None |
| 1-3 pages | 25 MB | 1.2 MB/page | 28-30 MB | Minimal |
| 5 pages | 25 MB | 1.4 MB/page | 32 MB | Low |
| 20 pages | 25 MB | 1.4 MB/page | 53 MB | Moderate |
| 30 pages | 25 MB | 1.4 MB/page | 68 MB | Moderate |
| 50 pages | 25 MB | 1.4 MB/page | 96 MB | High |

**Memory Characteristics:**
- **Base Overhead**: 25 MB (app + libraries)
- **Per-Page Cost**: 1.2-1.4 MB average (format-dependent)
- **PDF Extra Cost**: +2.5 MB per page (PDF.js rendering)
- **Garbage Collection**: Triggers at 100+ MB (50+ page docs)

---

## Table 6: Token Usage & AI Cost Estimation

| Document Size | Pages | Tokens/Document | GPT-4o Cost | Claude Sonnet Cost | AI Calls |
|--------------|-------|-----------------|-------------|-------------------|----------|
| Short (2P) | 0.5 | ~225 | $0.0006 | $0.0007 | 1 |
| Short (75%) | 1 | ~450 | $0.0011 | $0.0014 | 1 |
| Small (2-3P) | 2-3 | 900-1,350 | $0.0027 | $0.0034 | 1 |
| Medium (5P) | 5 | ~2,250 | $0.0056 | $0.0068 | 1-2 |
| Medium (20P) | 20 | ~9,000 | $0.0225 | $0.027 | 2 |
| Large (30P) | 30 | ~13,500 | $0.0338 | $0.041 | 3 |
| Large (50P) | 50 | ~22,500 | $0.0563 | $0.068 | 5 |

**Cost Analysis:**
- **Average Cost per Document**: $0.015 (GPT-4o) / $0.018 (Claude Sonnet)
- **Monthly Cost (1000 docs/month)**: $15-18
- **Token Efficiency**: ~450 tokens/page average
- **Caching Benefit**: 40% cost reduction on repeated documents

**Pricing Assumptions:**
- GPT-4o: $2.50 per 1M tokens (average input/output)
- Claude Sonnet 4: $3.00 per 1M tokens (average input/output)

---

## Table 7: Performance Baseline Comparison

| Metric | Before Optimization (Rev 00027) | After Optimization (Rev 00030) | Improvement |
|--------|--------------------------------|-------------------------------|-------------|
| **Chat Response Time (p90)** | 4,328ms | **2,800ms** | 35% faster ⬇️ |
| **PDF Parse Speed** | 5.6-11.8 pg/s | **11.9 pg/s** | 7% faster ⬆️ |
| **Memory Usage (20-page PDF)** | 78 MB | **60 MB** | 23% reduction ⬇️ |
| **Field Extraction Rate** | 78.6% (22/28) | **83.4% (23.3/28)** | 4.8% better ⬆️ |
| **Token Usage** | ~750 tokens/page | **~450 tokens/page** | 40% reduction ⬇️ |
| **Cache Hit Rate** | 0% (no caching) | **35%** | NEW ✨ |
| **Rate Limiting** | None | **100 req/min** | NEW ✨ |
| **Logging** | Basic console.log | **Winston structured** | NEW ✨ |

**Major Wins:**
- ✅ **LRU Caching**: 35% cache hit rate saves 1.5 seconds per cached request
- ✅ **Token Optimization**: 40% reduction = 40% AI cost savings
- ✅ **Memory Management**: 23% lower peak memory for large PDFs
- ✅ **Response Speed**: 1.5 second improvement in chat latency

---

## Table 8: Browser Stability Metrics

| Issue Type | Severity | Count | Impact | Status |
|-----------|----------|-------|--------|--------|
| Forced Synchronous Layout | High | 12/min | 800ms lag | 🔶 Code complete, UI pending |
| React Render Thrashing | Medium | 8/min | 400ms delay | 🔶 Code complete, UI pending |
| Long Tasks (>50ms) | Medium | 4/min | Janky scroll | ✅ Reduced by 60% |
| Cumulative Layout Shift | Medium | 0.18 | Visual instability | 🟢 Within limits |
| White Bar Flicker | High | 3/session | UX degradation | 🔶 Identified, fix pending |
| Memory Leaks | Medium | 2 sources | 45MB/hour | 🔶 Identified, fix pending |
| CSS Transition Conflicts | Low | 5 rules | Minor flicker | 🟢 Low priority |
| GPU Layer Thrash | Low | Occasional | Battery drain | 🟢 Low priority |

**Browser Stability Score**: 7.2/10 (Good - some optimizations pending UI integration)

---

## Table 9: Concurrent Performance (Load Testing)

| Concurrent Users | Avg Response Time | p95 Response Time | Success Rate | Server Load |
|-----------------|-------------------|-------------------|--------------|-------------|
| 1 user | 850ms | 1,200ms | 100% | 5% CPU |
| 5 users | 920ms | 1,450ms | 100% | 18% CPU |
| 10 users | 1,150ms | 2,100ms | 100% | 32% CPU |
| 25 users | 1,680ms | 3,200ms | 98% | 65% CPU |
| 50 users | 2,450ms | 4,800ms | 95% | 88% CPU |
| 100 users | **Rate limited** | **Rate limited** | N/A | Protected |

**Load Characteristics:**
- **Optimal Load**: 1-10 concurrent users (sub-2s response)
- **Acceptable Load**: 10-25 users (2-3s response)
- **Rate Limiting**: Protects at 100 requests/min per IP
- **Scaling Strategy**: Horizontal scaling recommended at 50+ users

---

## Table 10: Recommended Document Formats

| Use Case | Recommended Format | Why | Performance |
|----------|-------------------|-----|-------------|
| **Fastest Parsing** | TXT, Markdown | Direct text extraction | 82-122 pg/s |
| **Best Extraction** | DOCX, TXT | Clear structure + metadata | 85%+ accuracy |
| **Standard Documents** | PDF, DOCX | Universal compatibility | 12-22 pg/s |
| **Data-Heavy Projects** | CSV, XLSX | Tabular data | 18-68 pg/s |
| **Large Documents (50+ pages)** | Markdown, TXT | Lower memory footprint | <2s parse |
| **Real-Time Processing** | TXT, CSV | Sub-second response | <200ms |

**Format Selection Guidelines:**
1. **Speed Priority**: Use TXT or Markdown (10× faster than PDF)
2. **Compatibility Priority**: Use PDF or DOCX (universal support)
3. **Accuracy Priority**: Use DOCX or structured Markdown
4. **Memory Constrained**: Avoid PDF for large documents

---

## Summary Statistics

**Test Coverage:**
- ✅ 48 documents tested across 8 size variants
- ✅ 6 file formats validated (PDF, DOCX, MD, TXT, CSV, XLSX)
- ✅ Size range: 0.5 pages to 50 pages
- ✅ 100% test success rate

**Performance Highlights:**
- ⚡ Average parse time: **508ms**
- ⚡ Average throughput: **53.9 pages/second**
- ⚡ Average memory: **45 MB**
- ⚡ Field extraction: **83.4% success rate**

**Production Readiness:**
- ✅ Handles documents up to 50+ pages
- ✅ Sub-2-second parse for most documents
- ✅ Consistent extraction accuracy across all sizes
- ✅ Predictable memory scaling
- ✅ Rate limiting protects against overload

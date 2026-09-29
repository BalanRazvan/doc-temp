import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSearch, searchUrl } from './europepmc.ts'

function answer(hitCount: number, records: unknown[]): unknown {
  return {
    version: '6.9',
    hitCount,
    request: { queryString: 'test', resultType: 'core', cursorMark: '*', pageSize: 25 },
    resultList: { result: records },
  }
}

const journalArticle = {
  id: '42737027',
  source: 'MED',
  pmid: '42737027',
  pmcid: 'PMC13565869',
  doi: '10.3390/healthcare14172870',
  title: 'Leveraging Synthetic Clinical Data for Validation and Operational Readiness in Clinical Trials.',
  authorString: 'Musik S, Zalewski J, Jurkowska J, Pędzimąż W, Sasin-Kurowska J, Panczyk M.',
  pubYear: '2026',
  journalInfo: {
    volume: '14',
    yearOfPublication: 2026,
    journal: { title: 'Healthcare (Basel, Switzerland)', medlineAbbreviation: 'Healthcare (Basel)' },
  },
  abstractText:
    '<h4>Background</h4>Access to <i>in vivo</i> data at 10<sup>6</sup> records is slow (p &lt; 0.05).<h4>Methods</h4>We built it.',
  fullTextUrlList: { fullTextUrl: [{ site: 'DOI', url: 'https://doi.org/10.3390/healthcare14172870' }] },
}

const preprint = {
  id: 'PPR1324813',
  source: 'PPR',
  doi: '10.21203/rs.3.rs-10435731/v1',
  title: 'Beyond Statistical Similarity: A Clinical Validation Framework for Synthetic Acute Myeloid Leukemia Cohorts',
  authorString: 'Zaghi A, Polizzi S, Giampieri E, Sträng E, Bullinger L, Castellani G.',
  pubYear: '2026',
  bookOrReportDetails: { publisher: 'Research Square', yearOfPublication: 2026 },
  abstractText: '<title>Abstract</title>  <p>Purpose:  Access to high-quality clinical data is constrained.</p>',
}

const chineseAbstract = {
  id: '646922',
  source: 'CBA',
  title: 'Proteome maps of mammary tissues in healthy dairy cows and those with clinical mastitis',
  authorString: 'Yang Yongxin, Zhao Xingxu, Zhang Jinlong, Tao Jinzhong, Zhang Yong.',
  abstractText: 'In the mammary glands suffered from invading pathogens…',
}

test('the search address carries the words exactly as typed, and asks for 25 full records as JSON', () => {
  const words = '"heart failure" & Sjögren #2 AUTH:"Smith J"'
  const url = new URL(searchUrl(words))
  assert.equal(`${url.origin}${url.pathname}`, 'https://www.ebi.ac.uk/europepmc/webservices/rest/search')
  assert.deepEqual(
    [...url.searchParams],
    [
      ['query', words],
      ['format', 'json'],
      ['resultType', 'core'],
      ['pageSize', '25'],
    ],
  )
  assert.equal(url.hash, '')
})

test('a journal article becomes the row Save inserts, with its markup kept as sent', () => {
  assert.deepEqual(readSearch(answer(17214, [journalArticle])), {
    total: 17214,
    articles: [
      {
        external_id: 'MED:42737027',
        title: 'Leveraging Synthetic Clinical Data for Validation and Operational Readiness in Clinical Trials.',
        authors: 'Musik S, Zalewski J, Jurkowska J, Pędzimąż W, Sasin-Kurowska J, Panczyk M.',
        journal: 'Healthcare (Basel, Switzerland)',
        year: 2026,
        abstract:
          '<h4>Background</h4>Access to <i>in vivo</i> data at 10<sup>6</sup> records is slow (p &lt; 0.05).<h4>Methods</h4>We built it.',
        url: 'https://europepmc.org/article/MED/42737027',
      },
    ],
  })
})

test("a title's escaped tags become tags again, and nothing else in it changes", () => {
  const titles = [
    'CRISPR/dCas9-induced upregulation of endogenous apolipoprotein A1 and paraoxonase 1 genes reduces the aortic lipid deposits in apoE&lt;sup&gt;-/-&lt;/sup&gt; mice.',
    '5 years of &lt;i&gt;The Lancet Regional Health - Americas&lt;/i&gt;.',
    '<i>In vivo</i> intercellular CRISPR screens using viral proximity barcoding',
    'Before <i>p</i> < 0.05 to Beyond <i>p</i> < 0.05: Using History to Contextualize <i>p</i>-Values and Significance Testing.',
    'Pharmaceutical Pricing and R&amp;D as a Global Public Good.',
    'Detecting Health Care Disparities and the Problem With P <0.05.',
  ]
  const found = readSearch(answer(6, titles.map((title, index) => ({ ...journalArticle, id: `${index}`, title }))))
  assert.deepEqual(
    found?.articles.map((article) => article.title),
    [
      'CRISPR/dCas9-induced upregulation of endogenous apolipoprotein A1 and paraoxonase 1 genes reduces the aortic lipid deposits in apoE<sup>-/-</sup> mice.',
      '5 years of <i>The Lancet Regional Health - Americas</i>.',
      '<i>In vivo</i> intercellular CRISPR screens using viral proximity barcoding',
      'Before <i>p</i> < 0.05 to Beyond <i>p</i> < 0.05: Using History to Contextualize <i>p</i>-Values and Significance Testing.',
      'Pharmaceutical Pricing and R&amp;D as a Global Public Good.',
      'Detecting Health Care Disparities and the Problem With P <0.05.',
    ],
  )
})

test('the same number in two sources is two different articles, each with its own link', () => {
  const paper = {
    id: '879818',
    source: 'MED',
    title: 'Follicular atrophoderma and basal cell carcinomas: the Bazex syndrome.',
    pubYear: '1977',
    journalInfo: { journal: { title: 'Archives of dermatology' } },
  }
  const thesis = {
    id: '879818',
    source: 'ETH',
    title: 'Biological and clinical implications of the non-small cell lung cancer immune contexture',
    pubYear: '2023',
    bookOrReportDetails: { publisher: 'University of St Andrews', yearOfPublication: 2023 },
  }
  const found = readSearch(answer(2, [paper, thesis]))
  assert.deepEqual(
    found?.articles.map((article) => article.external_id),
    ['MED:879818', 'ETH:879818'],
  )
  assert.deepEqual(
    found?.articles.map((article) => article.url),
    ['https://europepmc.org/article/MED/879818', 'https://europepmc.org/article/ETH/879818'],
  )
})

test('with no journal the publisher is named, a journal wins over a publisher, and a record with neither names none', () => {
  const both = {
    ...journalArticle,
    id: '1',
    bookOrReportDetails: { publisher: 'MDPI' },
  }
  const found = readSearch(answer(3, [preprint, both, chineseAbstract]))
  assert.deepEqual(
    found?.articles.map((article) => article.journal),
    ['Research Square', 'Healthcare (Basel, Switzerland)', null],
  )
})

test('a field left out or blank is null, text is trimmed, and a year counts only as four digits', () => {
  const guideline = {
    id: '409824',
    source: 'HIR',
    title: '  MoorLDI2-BI : a laser doppler blood flow imager for burn wound assessment. ',
    pubYear: ' 2011 ',
    bookOrReportDetails: { publisher: 'NICE' },
    abstractText: '   ',
  }
  const found = readSearch(
    answer(5, [
      guideline,
      chineseAbstract,
      { ...preprint, id: 'PPR2', pubYear: '26', authorString: '' },
      { ...preprint, id: 'PPR3', pubYear: 'in press' },
      { ...preprint, id: 'PPR4', pubYear: '2019-2020' },
    ]),
  )
  assert.deepEqual(found?.articles[0], {
    external_id: 'HIR:409824',
    title: 'MoorLDI2-BI : a laser doppler blood flow imager for burn wound assessment.',
    authors: null,
    journal: 'NICE',
    year: 2011,
    abstract: null,
    url: 'https://europepmc.org/article/HIR/409824',
  })
  assert.deepEqual(
    found?.articles.map((article) => article.year),
    [2011, null, null, null, null],
  )
  assert.equal(found?.articles[2].authors, null)
  assert.equal(found?.articles[1].abstract, 'In the mammary glands suffered from invading pathogens…')
})

test("a record with no source, id or title is skipped, and the rest keep Europe PMC's order", () => {
  const found = readSearch(
    answer(9, [
      { ...chineseAbstract, id: 'first' },
      { source: 'MED', title: 'No id' },
      { id: '2', title: 'No source' },
      { id: '3', source: 'MED', title: '   ' },
      { id: '4', source: 'MED' },
      'not a record',
      null,
      { ...journalArticle, id: 'last' },
    ]),
  )
  assert.deepEqual(
    found?.articles.map((article) => article.external_id),
    ['CBA:first', 'MED:last'],
  )
  assert.equal(found?.total, 9)
})

test('no hits is an empty list, not a failure', () => {
  assert.deepEqual(readSearch(answer(0, [])), { total: 0, articles: [] })
})

test("an answer of any other shape can't be read, Europe PMC's own refusal included", () => {
  const bodies = [
    null,
    undefined,
    'Service Unavailable',
    42,
    [],
    {},
    { errCode: 404, errMsg: 'No search criteria provided. Please provide a search criteria which is less than 1500 characters.' },
    { hitCount: '3', resultList: { result: [] } },
    { hitCount: 3 },
    { hitCount: 3, resultList: {} },
    { hitCount: 3, resultList: { result: {} } },
  ]
  for (const body of bodies) assert.equal(readSearch(body), null, JSON.stringify(body))
})

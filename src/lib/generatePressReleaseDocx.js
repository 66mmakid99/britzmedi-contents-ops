// =====================================================
// Press Release .docx Generator — docx-js
// =====================================================
import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  Table, TableRow, TableCell,
  Header, Footer,
  AlignmentType, WidthType, ShadingType, BorderStyle,
  PageNumber, VerticalAlign,
} from 'docx';

// === 상수 ===
const A4_WIDTH = 11906;
const MARGIN = 1134;           // 2cm
const CONTENT_WIDTH = 9638;    // A4_WIDTH - MARGIN*2
const LABEL_COL = 2400;
const VALUE_COL = 7238;
const NUM_COL = 600;
const DESC_COL = 9038;

const BORDER_LIGHT = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS_ALL = { top: BORDER_LIGHT, bottom: BORDER_LIGHT, left: BORDER_LIGHT, right: BORDER_LIGHT };
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };
const LABEL_SHADING = { fill: 'F2F2F2', type: ShadingType.CLEAR };
const HEADER_SHADING = { fill: 'E8E8E8', type: ShadingType.CLEAR };

// === 헬퍼 ===

function labelCell(text) {
  return new TableCell({
    borders: BORDERS_ALL,
    width: { size: LABEL_COL, type: WidthType.DXA },
    shading: LABEL_SHADING,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, font: 'Malgun Gothic', size: 20 })],
    })],
  });
}

function valueCell(text, colWidth = VALUE_COL) {
  const lines = String(text || '').split('\n').filter(Boolean);
  return new TableCell({
    borders: BORDERS_ALL,
    width: { size: colWidth, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children: lines.length > 0
      ? lines.map((line) => new Paragraph({
          children: [new TextRun({ text: line, font: 'Malgun Gothic', size: 20 })],
        }))
      : [new Paragraph({ children: [] })],
  });
}

function infoRow(label, value) {
  return new TableRow({ children: [labelCell(label), valueCell(value)] });
}

function infoTable(rows) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_COL, VALUE_COL],
    rows: rows.map(([l, v]) => infoRow(l, v)),
  });
}

function numberedTable(headerText, items) {
  const headerRow = new TableRow({
    children: [new TableCell({
      borders: BORDERS_ALL,
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: HEADER_SHADING,
      margins: CELL_MARGINS,
      columnSpan: 2,
      children: [new Paragraph({
        children: [new TextRun({ text: headerText, bold: true, font: 'Malgun Gothic', size: 20 })],
      })],
    })],
  });

  const itemRows = items.map((item, i) => new TableRow({
    children: [
      new TableCell({
        borders: BORDERS_ALL,
        width: { size: NUM_COL, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(i + 1), font: 'Malgun Gothic', size: 20 })],
        })],
      }),
      new TableCell({
        borders: BORDERS_ALL,
        width: { size: DESC_COL, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [new Paragraph({
          children: [new TextRun({ text: item, font: 'Malgun Gothic', size: 20 })],
        })],
      }),
    ],
  }));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [NUM_COL, DESC_COL],
    rows: [headerRow, ...itemRows],
  });
}

// === 메인 함수 ===

/**
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.subtitle
 * @param {string} data.body       - 본문 (문단은 \n\n으로 구분)
 * @param {string} data.companyIntro
 * @param {object[]} [data.images] - 업로드된 이미지 배열 [{url, caption, width, height}]
 * @param {string} data.date
 * @param {string} data.website
 */
export async function generatePressReleaseDocx(data) {
  // Filter out placeholder text + photo/attachment guide sections
  const cleanBody = (data.body || '')
    .replace(/\[대표 인용문[^\]]*\]/g, '')
    .replace(/\[QUOTE_PLACEHOLDER\]/g, '')
    .replace(/\[인용문\]/g, '')
    .replace(/\[입력 필요:[^\]]*\]/g, '')
    .replace(/\[태그[:\s].*?\]/g, '')
    .replace(/\n태그[:\s].*$/gm, '')
    .replace(/\n#\S+(\s+#\S+)*/g, '')
    .replace(/\[사진\s*가이드\][\s\S]*?(?=\[회사\s*소개\]|\[첨부|\n\n\n|$)/gi, '')
    .replace(/\[첨부파일?\s*가이드\][\s\S]*?(?=\[회사\s*소개\]|뉴스와이어|\n\n\n|$)/gi, '')
    .replace(/사진 가이드[\s\S]*?(?=회사 소개|첨부파일|뉴스와이어|\n\n\n|$)/gi, '')
    .replace(/첨부파일 가이드[\s\S]*?(?=회사 소개|뉴스와이어|\n\n\n|$)/gi, '')
    .trim();

  const bodyParagraphs = cleanBody.split('\n\n').filter(Boolean).map((para) =>
    new Paragraph({
      spacing: { after: 200, line: 384 },
      children: [new TextRun({ text: para.trim(), font: 'Malgun Gothic', size: 22 })],
    })
  );

  // Quotes are now integrated into body paragraph 4, no separate section needed
  // Photo guide and attachment guide are removed from Word export

  // Fetch and prepare images for embedding
  const imageParagraphs = [];
  if (data.images?.length > 0) {
    for (const img of data.images) {
      try {
        const res = await fetch(img.url);
        const buf = await res.arrayBuffer();
        // Scale to fit content width (max ~500px / ~6667 DXA)
        const maxW = 500;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.round((img.width || 400) * scale);
        const h = Math.round((img.height || 300) * scale);
        imageParagraphs.push(
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: 'png' })],
          }),
        );
        if (img.caption) {
          imageParagraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: img.caption, font: 'Malgun Gothic', size: 18, color: '666666', italics: true })],
          }));
        }
      } catch { /* skip failed image */ }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Malgun Gothic', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({ children: [] }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'BRITZMEDI Co., Ltd. — ', font: 'Malgun Gothic', size: 16, color: '999999' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Malgun Gothic', size: 16, color: '999999' }),
            ],
          })],
        }),
      },
      children: [
        // ■ 문서 유형 헤더
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: '보 도 자 료', bold: true, font: 'Malgun Gothic', size: 32 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333', space: 8 } },
          children: [new TextRun({ text: 'PRESS RELEASE', font: 'Malgun Gothic', size: 24, color: '666666' })],
        }),

        // ■ 발신 정보 테이블
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        infoTable([
          ['배포일', data.date || '2026년 X월 X일'],
          ['발신', '브릿츠메디 주식회사'],
          ['담당자', '이성호 CMO'],
          ['연락처', '010-6525-9442\nsh.lee@britzmedi.co.kr'],
          ['배포 조건', '즉시 배포 가능'],
        ]),

        // ■ 제목
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: data.title || '', bold: true, font: 'Malgun Gothic', size: 28 })],
        }),

        // ■ 부제목
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: data.subtitle || '', font: 'Malgun Gothic', size: 24, color: '666666' })],
        }),

        // ■ 본문 (인용문은 본문 4번째 문단에 통합됨)
        ...bodyParagraphs,

        // ■ 사진
        ...imageParagraphs,

        // ■ 구분선
        new Paragraph({
          spacing: { before: 400 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: 'CCCCCC', space: 8 } },
          children: [],
        }),

        // ■ 회사 소개 (보일러플레이트)
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: '회사 소개', bold: true, font: 'Malgun Gothic', size: 20, color: '666666' })],
        }),
        ...(data.companyIntro || '').split('\n').filter(Boolean).map((line) =>
          new Paragraph({
            spacing: { after: 40, line: 360 },
            children: [new TextRun({ text: line, font: 'Malgun Gothic', size: 20, color: '666666' })],
          })
        ),

        // ■ 하단 연락처 테이블
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        infoTable([
          ['회사명', 'BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)'],
          ['대표이사', '이신재'],
          ['본사', '경기도 성남시 둔촌대로 388\n크란츠테크노 1211호'],
          ['홈페이지', data.website || 'www.britzmedi.co.kr / www.britzmedi.com'],
          ['미디어 문의', '이성호 CMO\nsh.lee@britzmedi.co.kr\n010-6525-9442'],
        ]),

      ],
    }],
  });

  return Packer.toBlob(doc);
}

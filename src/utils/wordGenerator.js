import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
  PageBreak
} from 'docx';
import { saveAs } from 'file-saver';

// Professional color scheme
const COLORS = {
  primary: '1a1a2e',      // Dark blue-black
  gold: 'FFB81C',         // Brand gold
  teal: '17B2B2',         // Brand teal
  darkGray: '333333',
  mediumGray: '666666',
  lightGray: 'EEEEEE',
  white: 'FFFFFF'
};

// Reusable text styles
const createHeading = (text, level = HeadingLevel.HEADING_1) => {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
    style: level === HeadingLevel.HEADING_1 ? 'Title' : undefined
  });
};

const createSubheading = (text) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.primary
      })
    ],
    spacing: { before: 300, after: 150 }
  });
};

const createBodyText = (text, options = {}) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
        color: options.color || COLORS.darkGray,
        bold: options.bold || false,
        italics: options.italics || false
      })
    ],
    spacing: { before: 100, after: 100 },
    alignment: options.alignment || AlignmentType.LEFT
  });
};

const createBulletPoint = (text, level = 0) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
        color: COLORS.darkGray
      })
    ],
    bullet: { level },
    spacing: { before: 50, after: 50 }
  });
};

const createLabelValue = (label, value) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 22,
        color: COLORS.darkGray
      }),
      new TextRun({
        text: value,
        size: 22,
        color: COLORS.mediumGray
      })
    ],
    spacing: { before: 80, after: 80 }
  });
};

const createSectionDivider = () => {
  return new Paragraph({
    children: [
      new TextRun({
        text: '─'.repeat(80),
        color: COLORS.lightGray,
        size: 16
      })
    ],
    spacing: { before: 200, after: 200 }
  });
};

// Create professional table
const createTable = (headers, rows, options = {}) => {
  const headerCells = headers.map(header => 
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: header,
              bold: true,
              size: 20,
              color: COLORS.white
            })
          ],
          alignment: AlignmentType.CENTER
        })
      ],
      shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 100, right: 100 }
    })
  );

  const dataRows = rows.map((row, rowIndex) => 
    new TableRow({
      children: row.map(cell => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(cell),
                  size: 20,
                  color: COLORS.darkGray
                })
              ]
            })
          ],
          shading: { 
            fill: rowIndex % 2 === 0 ? COLORS.white : COLORS.lightGray, 
            type: ShadingType.CLEAR 
          },
          margins: { top: 80, bottom: 80, left: 100, right: 100 }
        })
      )
    })
  );

  return new Table({
    rows: [
      new TableRow({ children: headerCells }),
      ...dataRows
    ],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
};

// Create a beautifully formatted table
const createProfessionalTable = (headers, rows) => {
  // Header row with dark background
  const headerCells = headers.map(header => 
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: header,
              bold: true,
              size: 20,
              color: COLORS.white
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 }
        })
      ],
      shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      verticalAlign: 'center'
    })
  );

  // Data rows with alternating colors
  const dataRows = rows.map((row, rowIndex) => 
    new TableRow({
      children: row.map((cell, cellIndex) => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(cell || ''),
                  size: 20,
                  color: COLORS.darkGray,
                  bold: cellIndex === 0 // Bold first column
                })
              ],
              spacing: { before: 40, after: 40 }
            })
          ],
          shading: { 
            fill: rowIndex % 2 === 0 ? COLORS.white : 'F8F9FA', 
            type: ShadingType.CLEAR 
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 }
        })
      )
    })
  );

  return new Table({
    rows: [
      new TableRow({ 
        children: headerCells,
        tableHeader: true
      }),
      ...dataRows
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' }
    }
  });
};

// Parse markdown table into headers and rows
const parseMarkdownTable = (lines, startIndex) => {
  const headers = [];
  const rows = [];
  let i = startIndex;
  
  // Parse header row
  if (lines[i] && lines[i].includes('|')) {
    const headerLine = lines[i].trim();
    const cells = headerLine.split('|').map(c => c.trim()).filter(c => c);
    headers.push(...cells);
    i++;
  }
  
  // Skip separator row (|---|---|)
  if (lines[i] && lines[i].match(/^\|?[\s-:|]+\|?$/)) {
    i++;
  }
  
  // Parse data rows
  while (i < lines.length && lines[i] && lines[i].includes('|')) {
    const rowLine = lines[i].trim();
    if (rowLine.match(/^\|?[\s-:|]+\|?$/)) {
      i++;
      continue;
    }
    const cells = rowLine.split('|').map(c => c.trim().replace(/\*\*/g, '')).filter(c => c);
    if (cells.length > 0) {
      rows.push(cells);
    }
    i++;
  }
  
  return { headers, rows, endIndex: i };
};

// Parse structured content from AI response (remove markdown)
const parseContent = (text) => {
  if (!text) return [];
  
  const paragraphs = [];
  const lines = text.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    let line = lines[i];
    let trimmed = line.trim();
    
    if (!trimmed) {
      i++;
      continue;
    }
    
    // Detect markdown table (starts with |)
    if (trimmed.startsWith('|') || (trimmed.includes('|') && lines[i + 1]?.match(/^\|?[\s-:|]+\|?$/))) {
      const { headers, rows, endIndex } = parseMarkdownTable(lines, i);
      if (headers.length > 0 && rows.length > 0) {
        paragraphs.push(new Paragraph({ spacing: { before: 200 } }));
        paragraphs.push(createProfessionalTable(headers, rows));
        paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
      }
      i = endIndex;
      continue;
    }
    
    // Remove markdown formatting
    trimmed = trimmed
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Detect headers (lines that were markdown headers or all caps)
    if (line.match(/^#{1,3}\s/) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && !trimmed.includes('|'))) {
      paragraphs.push(createSubheading(trimmed));
    }
    // Detect bullet points
    else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
      paragraphs.push(createBulletPoint(content));
    }
    // Detect key: value pairs
    else if (trimmed.includes(':') && trimmed.indexOf(':') < 40 && !trimmed.includes('|')) {
      const colonIndex = trimmed.indexOf(':');
      const label = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (value) {
        paragraphs.push(createLabelValue(label, value));
      } else {
        paragraphs.push(createSubheading(label));
      }
    }
    // Regular text
    else if (!trimmed.match(/^[\s-:|]+$/)) {
      paragraphs.push(createBodyText(trimmed));
    }
    
    i++;
  }
  
  return paragraphs;
};

// Generate Project Analysis Document
export const generateAnalysisDocument = async (project, analysis, companyProfile) => {
  // Title Page elements
  const titlePage = [
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'PROJECT ANALYSIS',
          bold: true,
          size: 72,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Untitled Project',
          size: 48,
          color: COLORS.gold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    createSectionDivider(),
    new Paragraph({ spacing: { before: 400 } }),
    createLabelValue('Customer', project.customer || 'N/A'),
    createLabelValue('Location', `${project.address || ''} ${project.city || ''}`.trim() || 'N/A'),
    createLabelValue('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
    project.dueDate ? createLabelValue('Due Date', new Date(project.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })) : null,
    new Paragraph({ spacing: { before: 800 } }),
    companyProfile?.companyName ? new Paragraph({
      children: [
        new TextRun({
          text: `Prepared by: ${companyProfile.companyName}`,
          size: 24,
          color: COLORS.mediumGray
        })
      ],
      alignment: AlignmentType.CENTER
    }) : null,
    new Paragraph({
      children: [new PageBreak()]
    })
  ].filter(Boolean);

  // Build sections array
  const sections = [
    ...titlePage,
    createHeading('Analysis Summary', HeadingLevel.HEADING_1),
    ...parseContent(analysis)
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.name || 'Project'}_Analysis.docx`);
  return blob;
};

// Generate Professional Proposal Document
export const generateProposalDocument = async (project, content, companyProfile) => {
  // Cover Page elements
  const coverPage = [
    new Paragraph({ spacing: { before: 1500 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: companyProfile?.companyName || 'Your Company',
          bold: true,
          size: 56,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    companyProfile?.address ? new Paragraph({
      children: [
        new TextRun({
          text: `${companyProfile.address}, ${companyProfile.city || ''} ${companyProfile.state || ''} ${companyProfile.zip || ''}`,
          size: 22,
          color: COLORS.mediumGray
        })
      ],
      alignment: AlignmentType.CENTER
    }) : null,
    companyProfile?.phone ? new Paragraph({
      children: [
        new TextRun({
          text: companyProfile.phone,
          size: 22,
          color: COLORS.mediumGray
        })
      ],
      alignment: AlignmentType.CENTER
    }) : null,
    new Paragraph({ spacing: { before: 800 } }),
    createSectionDivider(),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'PROPOSAL',
          bold: true,
          size: 72,
          color: COLORS.gold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Project Proposal',
          size: 40,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    createSectionDivider(),
    new Paragraph({ spacing: { before: 600 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Prepared For:',
          bold: true,
          size: 24,
          color: COLORS.mediumGray
        })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.customer || 'Valued Customer',
          size: 32,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          size: 24,
          color: COLORS.mediumGray
        })
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [new PageBreak()]
    })
  ].filter(Boolean);

  const sections = [...coverPage];

  // Proposal Content
  sections.push(...parseContent(content));

  // Signature Section
  sections.push(
    new Paragraph({ spacing: { before: 800 } }),
    createSectionDivider(),
    new Paragraph({
      children: [
        new TextRun({
          text: 'ACCEPTANCE',
          bold: true,
          size: 28,
          color: COLORS.primary
        })
      ],
      spacing: { before: 400, after: 200 }
    }),
    createBodyText('By signing below, the customer accepts this proposal and authorizes the work to proceed.'),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Customer Signature: ', size: 22 }),
        new TextRun({ text: '_'.repeat(40), size: 22 })
      ]
    }),
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', size: 22 }),
        new TextRun({ text: '_'.repeat(20), size: 22 })
      ]
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Contractor Signature: ', size: 22 }),
        new TextRun({ text: '_'.repeat(40), size: 22 })
      ]
    }),
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', size: 22 }),
        new TextRun({ text: '_'.repeat(20), size: 22 })
      ]
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.name || 'Project'}_Proposal.docx`);
  return blob;
};

// Generate Bill of Materials Document
export const generateBOMDocument = async (project, content, companyProfile) => {
  const sections = [];
  
  // Header
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'BILL OF MATERIALS',
          bold: true,
          size: 48,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Project',
          size: 32,
          color: COLORS.gold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    createLabelValue('Customer', project.customer || 'N/A'),
    createLabelValue('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
    createSectionDivider()
  );

  // BOM Content
  sections.push(...parseContent(content));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.75),
            right: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.75),
            left: convertInchesToTwip(0.75)
          }
        }
      },
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.name || 'Project'}_BOM.docx`);
  return blob;
};

// Generate Labor Estimate Document
export const generateLaborDocument = async (project, content, companyProfile) => {
  const sections = [];
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'LABOR ESTIMATE',
          bold: true,
          size: 48,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Project',
          size: 32,
          color: COLORS.gold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    createLabelValue('Customer', project.customer || 'N/A'),
    createLabelValue('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
    createSectionDivider(),
    ...parseContent(content)
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.name || 'Project'}_Labor_Estimate.docx`);
  return blob;
};

// Generate generic document
export const generateGenericDocument = async (project, title, content, companyProfile) => {
  const sections = [];
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 48,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Project',
          size: 32,
          color: COLORS.gold
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    createLabelValue('Customer', project.customer || 'N/A'),
    createLabelValue('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
    createSectionDivider(),
    ...parseContent(content)
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: sections
    }]
  });

  const filename = title.replace(/[^a-zA-Z0-9]/g, '_');
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${project.name || 'Project'}_${filename}.docx`);
  return blob;
};

// Export all generators
export default {
  generateAnalysisDocument,
  generateProposalDocument,
  generateBOMDocument,
  generateLaborDocument,
  generateGenericDocument
};

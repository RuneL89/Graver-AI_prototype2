import fs from 'fs/promises';
import path from 'path';
import { WikiPage, updateIndex, appendLog } from '../src/knowledge/wiki-page.js';

async function setupKbBusinessRegistry() {
  const kb = 'kb-business-registry';
  const wikiDir = path.resolve('data', kb, 'wiki');

  // Clean old entities
  await fs.rm(path.join(wikiDir, 'entities'), { recursive: true, force: true });
  await fs.mkdir(path.join(wikiDir, 'entities'), { recursive: true });

  const oceanic = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Oceanic Logistics Ltd',
    content: `# Oceanic Logistics Ltd\n\n## Summary\n\nShipping and logistics company registered in Port City.\n\n## Connections\n\n- [[Maria Gonzalez]] — Director\n- [[Jens Hansen]] — Director (alias Director Y)\n- Port Infrastructure Upgrade — Contract vendor\n\n## Sources\n\n- [[business_registry_q1_2026]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await oceanic.save();

  const northstar = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'NorthStar Procurement Inc',
    content: `# NorthStar Procurement Inc\n\n## Summary\n\nGovernment procurement vendor based in Capital City.\n\n## Connections\n\n- [[Jens Hansen]] — Director\n- [[Samuel Osei]] — Director\n- Government IT Services — Contract vendor\n\n## Sources\n\n- [[business_registry_q1_2026]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await northstar.save();

  const maria = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Maria Gonzalez',
    content: `# Maria Gonzalez\n\n## Summary\n\nDirector of Oceanic Logistics Ltd. Signatory on Port Infrastructure Upgrade contract.\n\n## Connections\n\n- [[Oceanic Logistics Ltd]] — Director\n\n## Sources\n\n- [[business_registry_q1_2026]]\n- procurement_contracts_2025 (kb-procurement)\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 2, status: 'active' },
  });
  await maria.save();

  const jens = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Jens Hansen',
    content: `# Jens Hansen\n\n## Summary\n\nDirector of both Oceanic Logistics Ltd and NorthStar Procurement Inc. Also known as J. Hansen. Subject of sanctions.\n\n## Connections\n\n- [[Oceanic Logistics Ltd]] — Director\n- [[NorthStar Procurement Inc]] — Director\n- Government IT Services — Signatory\n\n## Sources\n\n- [[business_registry_q1_2026]]\n- sanctions_list_march_2026 (kb-sanctions)\n- procurement_contracts_2025 (kb-procurement)\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 3, status: 'active', aliases: 'J. Hansen, Director Y' },
  });
  await jens.save();

  const samuel = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Samuel Osei',
    content: `# Samuel Osei\n\n## Summary\n\nDirector of NorthStar Procurement Inc.\n\n## Connections\n\n- [[NorthStar Procurement Inc]] — Director\n\n## Sources\n\n- [[business_registry_q1_2026]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await samuel.save();

  const beneficial = new WikiPage({
    kbName: kb,
    pageType: 'concept',
    title: 'Beneficial Ownership',
    content: `# Beneficial Ownership\n\nThe right to enjoy benefits from ownership even when title is in another name. Relevant for tracing shell companies and hidden directors.`,
    frontmatter: { source_count: 0, status: 'active' },
  });
  await beneficial.save();

  await updateIndex(kb, {
    entities: [
      { title: 'Oceanic Logistics Ltd', summary: 'Shipping company in Port City' },
      { title: 'NorthStar Procurement Inc', summary: 'Procurement vendor in Capital City' },
      { title: 'Maria Gonzalez', summary: 'Director of Oceanic Logistics Ltd' },
      { title: 'Jens Hansen', summary: 'Director linked to sanctions' },
      { title: 'Samuel Osei', summary: 'Director of NorthStar Procurement Inc' },
    ],
    concepts: [
      { title: 'Beneficial Ownership', summary: 'Domain concept for hidden ownership' },
    ],
    sources: [
      { title: 'business_registry_q1_2026', summary: 'Registry extract PDF' },
    ],
    synthesis: [],
  });

  await appendLog(kb, 'Demo wiki setup complete');
}

async function setupKbSanctions() {
  const kb = 'kb-sanctions';
  const wikiDir = path.resolve('data', kb, 'wiki');

  await fs.rm(path.join(wikiDir, 'entities'), { recursive: true, force: true });
  await fs.mkdir(path.join(wikiDir, 'entities'), { recursive: true });

  const jens = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Jens Hansen',
    content: `# Jens Hansen\n\n## Summary\n\nIndividual sanctioned on 2025-11-14 for alleged involvement in procurement fraud and money laundering. Alias J. Hansen.\n\n## Connections\n\n- NorthStar Procurement Inc — Related entity\n- [[Procurement Fraud]] — Sanction reason\n\n## Sources\n\n- [[sanctions_list_march_2026]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active', aliases: 'J. Hansen' },
  });
  await jens.save();

  const globalShipping = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Global Shipping Partners',
    content: `# Global Shipping Partners\n\n## Summary\n\nCorporate entity sanctioned on 2025-09-02 for trade restrictions violation.\n\n## Connections\n\nNone.\n\n## Sources\n\n- [[sanctions_list_march_2026]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await globalShipping.save();

  const fraud = new WikiPage({
    kbName: kb,
    pageType: 'concept',
    title: 'Procurement Fraud',
    content: `# Procurement Fraud\n\nManipulation of public procurement processes for personal or corporate gain. Includes bid-rigging, kickbacks, and false invoicing.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await fraud.save();

  await updateIndex(kb, {
    entities: [
      { title: 'Jens Hansen', summary: 'Sanctioned individual for procurement fraud' },
      { title: 'Global Shipping Partners', summary: 'Sanctioned corporate entity' },
    ],
    concepts: [
      { title: 'Procurement Fraud', summary: 'Domain concept for procurement manipulation' },
    ],
    sources: [
      { title: 'sanctions_list_march_2026', summary: 'Sanctions list PDF' },
    ],
    synthesis: [],
  });

  await appendLog(kb, 'Demo wiki setup complete');
}

async function setupKbProcurement() {
  const kb = 'kb-procurement';
  const wikiDir = path.resolve('data', kb, 'wiki');

  await fs.rm(path.join(wikiDir, 'entities'), { recursive: true, force: true });
  await fs.mkdir(path.join(wikiDir, 'entities'), { recursive: true });

  const contract1 = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'PC-2025-00442',
    content: `# PC-2025-00442\n\n## Summary\n\nPort Infrastructure Upgrade contract awarded to Oceanic Logistics Ltd for USD 4,200,000. Signed by Maria Gonzalez on 2025-08-15.\n\n## Connections\n\n- [[Oceanic Logistics Ltd]] — Vendor\n- [[Maria Gonzalez]] — Signatory Director\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await contract1.save();

  const contract2 = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'PC-2025-00991',
    content: `# PC-2025-00991\n\n## Summary\n\nGovernment IT Services contract awarded to NorthStar Procurement Inc for USD 1,850,000. Signed by Jens Hansen on 2025-10-03.\n\n## Connections\n\n- [[NorthStar Procurement Inc]] — Vendor\n- [[Jens Hansen]] — Signatory Director\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await contract2.save();

  const oceanic = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Oceanic Logistics Ltd',
    content: `# Oceanic Logistics Ltd\n\n## Summary\n\nVendor on Port Infrastructure Upgrade (PC-2025-00442).\n\n## Connections\n\n- [[PC-2025-00442]] — Contract\n- [[Maria Gonzalez]] — Signatory\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await oceanic.save();

  const northstar = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'NorthStar Procurement Inc',
    content: `# NorthStar Procurement Inc\n\n## Summary\n\nVendor on Government IT Services (PC-2025-00991).\n\n## Connections\n\n- [[PC-2025-00991]] — Contract\n- [[Jens Hansen]] — Signatory\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await northstar.save();

  const maria = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Maria Gonzalez',
    content: `# Maria Gonzalez\n\n## Summary\n\nSignatory Director on PC-2025-00442 for Oceanic Logistics Ltd.\n\n## Connections\n\n- [[PC-2025-00442]] — Signatory\n- [[Oceanic Logistics Ltd]] — Company\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await maria.save();

  const jens = new WikiPage({
    kbName: kb,
    pageType: 'entity',
    title: 'Jens Hansen',
    content: `# Jens Hansen\n\n## Summary\n\nSignatory Director on PC-2025-00991 for NorthStar Procurement Inc.\n\n## Connections\n\n- [[PC-2025-00991]] — Signatory\n- [[NorthStar Procurement Inc]] — Company\n\n## Sources\n\n- [[procurement_contracts_2025]]\n\n## Contradictions\n\nNone.`,
    frontmatter: { source_count: 1, status: 'active' },
  });
  await jens.save();

  const threshold = new WikiPage({
    kbName: kb,
    pageType: 'concept',
    title: 'Public Procurement Threshold',
    content: `# Public Procurement Threshold\n\nFinancial limits above which public contracts require competitive bidding and enhanced disclosure.`,
    frontmatter: { source_count: 0, status: 'active' },
  });
  await threshold.save();

  await updateIndex(kb, {
    entities: [
      { title: 'PC-2025-00442', summary: 'Port Infrastructure Upgrade, USD 4.2M' },
      { title: 'PC-2025-00991', summary: 'Government IT Services, USD 1.85M' },
      { title: 'Oceanic Logistics Ltd', summary: 'Vendor on PC-2025-00442' },
      { title: 'NorthStar Procurement Inc', summary: 'Vendor on PC-2025-00991' },
      { title: 'Maria Gonzalez', summary: 'Signatory on PC-2025-00442' },
      { title: 'Jens Hansen', summary: 'Signatory on PC-2025-00991' },
    ],
    concepts: [
      { title: 'Public Procurement Threshold', summary: 'Financial disclosure limits' },
    ],
    sources: [
      { title: 'procurement_contracts_2025', summary: 'Procurement contracts PDF' },
    ],
    synthesis: [],
  });

  await appendLog(kb, 'Demo wiki setup complete');
}

async function setupRegistry() {
  const regPath = path.resolve('data', 'kb-registry', 'index.md');
  const content = `# Knowledge Base Registry\n\nThis is the wiki-of-wikis catalog. Each entry links to a domain-specific knowledge base.\n\n## Catalog\n\n| Knowledge Base | Domain | Summary |\n|----------------|--------|---------|\n| [[kb-business-registry]] | Business Registry | Company and director registrations |\n| [[kb-sanctions]] | Sanctions | Sanctioned individuals and entities |\n| [[kb-procurement]] | Procurement | Public contracts and vendors |\n| [[kb-demo]] | Demo | Empty demo scaffold |\n`;
  await fs.writeFile(regPath, content);
}

async function main() {
  await setupKbBusinessRegistry();
  await setupKbSanctions();
  await setupKbProcurement();
  await setupRegistry();
  console.log('All demo wikis set up.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

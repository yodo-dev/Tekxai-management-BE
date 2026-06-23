import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

export default async function seed_expenses(prisma) {
  console.log('[expenses] seeding...');

  // Categories
  const CATEGORIES = [
    'Rent', 'Electricity', 'Internet/PTCL', 'Grocery', 'Office Supplies',
    'Salaries', 'Fuel', 'Equipment/Hardware', 'Legal/Tax/Challan',
    'Subscriptions', 'Repairs/Maintenance', 'Travel', 'Meals', 'Miscellaneous', 'Software Licenses',
  ];
  const catMap = {};
  for (const name of CATEGORIES) {
    const cat = await prisma.expense_categories.upsert({ where: { name }, update: {}, create: { name } });
    catMap[name] = cat.id;
  }

  // Find users by first_name (from existing demo seed)
  const findUser = async (first) => prisma.users.findFirst({ where: { first_name: { contains: first, mode: 'insensitive' } } });

  const zia  = await findUser('Zia');
  const sana = await findUser('Sana');
  const saad = await findUser('Saad');

  if (!zia && !sana && !saad) {
    console.log('[expenses] No demo users found (Zia/Sana/Saad) — skipping expense seed');
    return;
  }

  const seedAccount = async (user, opening) => {
    if (!user) return null;
    return prisma.expense_accounts.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id, opening_balance: opening, is_enabled: true },
    });
  };

  const ziaAcc  = await seedAccount(zia,  0);
  const sanaAcc = await seedAccount(sana, 0);
  const saadAcc = await seedAccount(saad, 0);

  const addTxn = async (acc, user, data) => {
    if (!acc || !user) return;
    const existing = await prisma.expense_transactions.findFirst({
      where: { expense_account_id: acc.id, title: data.title, date: new Date(data.date) }
    });
    if (existing) return;
    return prisma.expense_transactions.create({
      data: { expense_account_id: acc.id, user_id: user.id, ...data, date: new Date(data.date) }
    });
  };

  // Zia transactions
  if (ziaAcc && zia) {
    // Income
    await addTxn(ziaAcc, zia, { transaction_type:'income', date:'2026-06-04', title:'Company transfer', total_amount:800000, ce_amount:400000, tekxai_amount:400000 });
    await addTxn(ziaAcc, zia, { transaction_type:'income', date:'2026-06-10', title:'Company transfer', total_amount:500000, ce_amount:250000, tekxai_amount:250000 });
    await addTxn(ziaAcc, zia, { transaction_type:'income', date:'2026-06-18', title:'Company transfer', total_amount:500000, ce_amount:250000, tekxai_amount:250000 });
    // Expenses
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-05', title:'Rent JT',                category_id:catMap['Rent'],               total_amount:500232, ce_amount:250116, tekxai_amount:250116, paid_to:'Landlord JT' });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-05', title:'Zia Apartment',         category_id:catMap['Rent'],               total_amount:53000,  ce_amount:0,      tekxai_amount:53000,  paid_to:'Landlord' });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-07', title:'Office Boy Salaries 50%',category_id:catMap['Salaries'],          total_amount:109927, ce_amount:109927, tekxai_amount:0 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-08', title:'Electricity Bill',      category_id:catMap['Electricity'],        total_amount:28500,  ce_amount:14250,  tekxai_amount:14250 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-09', title:'Internet / PTCL',       category_id:catMap['Internet/PTCL'],      total_amount:15000,  ce_amount:15000,  tekxai_amount:0 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-11', title:'Office Grocery',        category_id:catMap['Grocery'],            total_amount:45000,  ce_amount:22500,  tekxai_amount:22500 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-12', title:'Fuel',                  category_id:catMap['Fuel'],               total_amount:35000,  ce_amount:17500,  tekxai_amount:17500 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-14', title:'Legal / Challan',       category_id:catMap['Legal/Tax/Challan'],  total_amount:12000,  ce_amount:12000,  tekxai_amount:0 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-15', title:'Laptop Purchase',       category_id:catMap['Equipment/Hardware'], total_amount:180000, ce_amount:90000,  tekxai_amount:90000 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-16', title:'Software Subscriptions',category_id:catMap['Software Licenses'],  total_amount:25000,  ce_amount:0,      tekxai_amount:25000 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-19', title:'Office Supplies',       category_id:catMap['Office Supplies'],    total_amount:18500,  ce_amount:9250,   tekxai_amount:9250 });
    await addTxn(ziaAcc, zia, { transaction_type:'expense', date:'2026-06-20', title:'Repairs / Maintenance', category_id:catMap['Repairs/Maintenance'],total_amount:22000,  ce_amount:22000,  tekxai_amount:0 });
  }

  // Sana transactions
  if (sanaAcc && sana) {
    await addTxn(sanaAcc, sana, { transaction_type:'income',  date:'2026-06-01', title:'Company transfer',  total_amount:300000, ce_amount:150000, tekxai_amount:150000 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-02', title:'Office Supplies',   category_id:catMap['Office Supplies'],    total_amount:28000,  ce_amount:14000, tekxai_amount:14000 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-04', title:'Staff Salaries',    category_id:catMap['Salaries'],           total_amount:85000,  ce_amount:85000, tekxai_amount:0 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-06', title:'Repairs',           category_id:catMap['Repairs/Maintenance'],total_amount:18500,  ce_amount:9250,  tekxai_amount:9250 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-09', title:'Grocery',           category_id:catMap['Grocery'],            total_amount:32000,  ce_amount:16000, tekxai_amount:16000 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-12', title:'Fuel',              category_id:catMap['Fuel'],               total_amount:21500,  ce_amount:10750, tekxai_amount:10750 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-15', title:'Miscellaneous',     category_id:catMap['Miscellaneous'],      total_amount:15000,  ce_amount:0,     tekxai_amount:15000 });
    await addTxn(sanaAcc, sana, { transaction_type:'expense', date:'2026-06-18', title:'Electricity',       category_id:catMap['Electricity'],        total_amount:19000,  ce_amount:9500,  tekxai_amount:9500 });
  }

  // Saad transactions (Johar Town)
  if (saadAcc && saad) {
    await addTxn(saadAcc, saad, { transaction_type:'income',  date:'2026-06-01', title:'Company transfer',     total_amount:600000, ce_amount:300000, tekxai_amount:300000 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-02', title:'Rent Johar Town',      category_id:catMap['Rent'],               total_amount:220000, ce_amount:110000, tekxai_amount:110000 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-04', title:'Electricity JT',       category_id:catMap['Electricity'],        total_amount:35000,  ce_amount:17500,  tekxai_amount:17500 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-06', title:'Fuel JT',              category_id:catMap['Fuel'],               total_amount:42000,  ce_amount:21000,  tekxai_amount:21000 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-08', title:'Grocery JT',           category_id:catMap['Grocery'],            total_amount:55000,  ce_amount:27500,  tekxai_amount:27500 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-10', title:'Internet JT',          category_id:catMap['Internet/PTCL'],      total_amount:18000,  ce_amount:18000,  tekxai_amount:0 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-12', title:'Office Boy Salary JT', category_id:catMap['Salaries'],           total_amount:75000,  ce_amount:75000,  tekxai_amount:0 });
    await addTxn(saadAcc, saad, { transaction_type:'expense', date:'2026-06-15', title:'Repairs JT',           category_id:catMap['Repairs/Maintenance'],total_amount:28000,  ce_amount:14000,  tekxai_amount:14000 });
  }

  console.log('[expenses] seeding complete');
}

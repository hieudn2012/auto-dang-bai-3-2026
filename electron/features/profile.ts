import { loadMainConfig, waitRandom } from "./common";
import nodePath from 'node:path';
import fs from 'node:fs';
import puppeteer, { ElementHandle } from "puppeteer";
import { IpcMainEvent } from "electron";
import { sendMessage } from "./event";

const lastNames = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
  'Đinh',
  'Mai',
  'Trịnh',
  'Đoàn'
];

const middleMaleNames = [
  'Văn',
  'Hữu',
  'Công',
  'Đức',
  'Minh',
  'Quốc',
  'Gia',
  'Thanh',
  'Xuân',
  'Nhật',
  'Ngọc',
  'Anh',
  'Tuấn',
  'Trọng',
  'Đình',
  'Khắc',
  'Bảo',
  'Thành'
];

const middleFemaleNames = [
  'Thị',
  'Ngọc',
  'Thanh',
  'Thu',
  'Diệu',
  'Kim',
  'Mỹ',
  'Bích',
  'Phương',
  'Hồng',
  'Mai',
  'Lan',
  'Quỳnh',
  'Thảo',
  'Ánh',
  'Tường'
];

const maleNames = [
  'An',
  'Bảo',
  'Bình',
  'Cường',
  'Dũng',
  'Đạt',
  'Đức',
  'Giang',
  'Hải',
  'Hiếu',
  'Hoàng',
  'Hùng',
  'Huy',
  'Khang',
  'Kiên',
  'Long',
  'Minh',
  'Nam',
  'Phong',
  'Phúc',
  'Quân',
  'Sơn',
  'Tài',
  'Thành',
  'Thắng',
  'Tuấn',
  'Việt',
  'Vinh'
];

const femaleNames = [
  'Anh',
  'Chi',
  'Dung',
  'Giang',
  'Hà',
  'Hạnh',
  'Hoa',
  'Hương',
  'Khánh',
  'Lan',
  'Linh',
  'Mai',
  'My',
  'Nga',
  'Ngân',
  'Nhi',
  'Nhung',
  'Oanh',
  'Phương',
  'Quỳnh',
  'Thảo',
  'Trang',
  'Trâm',
  'Uyên',
  'Vy',
  'Yến'
];

type Sex = 'male' | 'female';

const randomName = (sex: Sex) => {
  switch (sex) {
    case 'male':
      return maleNames[Math.floor(Math.random() * maleNames.length)];
    case 'female':
      return femaleNames[Math.floor(Math.random() * femaleNames.length)];
  }
};

const randomMiddleName = (sex: Sex) => {
  switch (sex) {
    case 'male':
      return middleMaleNames[Math.floor(Math.random() * middleMaleNames.length)];
    case 'female':
      return middleFemaleNames[Math.floor(Math.random() * middleFemaleNames.length)];
  }
};

const randomLastName = () => {
  return lastNames[Math.floor(Math.random() * lastNames.length)];
};

const getFullName = (sex: Sex) => {
  return `${randomLastName()} ${randomMiddleName(sex)} ${randomName(sex)}`;
};

export interface GenerateProfileParams {
  sex: Sex;
  id: number;
}

export const generateProfile = async ({ sex, id }: GenerateProfileParams) => {
  const config = await loadMainConfig();
  let fullName = '';
  let username = '';
  let s = '';
  let idNumber = 0;

  const profilePath = nodePath.join(config?.profileDir || '', String(id));

  // create profile folder
  if (!fs.existsSync(profilePath)) {
    await fs.promises.mkdir(profilePath, { recursive: true });
  }

  // create info.txt if not exists
  if (!fs.existsSync(nodePath.join(profilePath, 'info.txt'))) {
    fs.writeFileSync(nodePath.join(profilePath, 'info.txt'), '');
  }

  // get current info in info.txt
  const infoTxt = fs.readFileSync(nodePath.join(profilePath, 'info.txt'), 'utf8').trim();
  if (infoTxt) {
    const [fn, un, sx, i] = infoTxt.split('||');
    fullName = fn.trim();
    username = un.trim().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    s = sx.trim() as Sex;
    idNumber = Number(i.trim());
  }

  if (!fullName || !username || !s || !idNumber) {
    fullName = getFullName(sex);
    username = `${fullName.toLowerCase().replace(/ /g, '')}.${id}`.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    s = sex;
    idNumber = id;
  }

  // create info.txt with
  // fullName || username || sex || id
  fs.writeFileSync(nodePath.join(profilePath, 'info.txt'), `${fullName} || ${username} || ${s} || ${idNumber}`);
}

interface ProfileInfo {
  fullName: string;
  username: string;
  sex: Sex;
  idNumber: number;
  profilePicture: string;
}

const getProfileInfo = async (id: number): Promise<ProfileInfo> => {
  const config = await loadMainConfig();
  const profilePath = nodePath.join(config?.profileDir || '', String(id));
  const infoTxt = fs.readFileSync(nodePath.join(profilePath, 'info.txt'), 'utf8').trim();
  const [fn, un, sx, i] = infoTxt.split('||');
  return {
    fullName: fn.trim() || '',
    username: un.trim() || '',
    sex: sx.trim() as Sex || '',
    idNumber: Number(i.trim()) || 0,
    profilePicture: nodePath.join(profilePath, 'avatar.png'),
  };
}

export interface ProfileResult {
  [key: string]: { profile_id: number, name: string, username: string, sex: Sex, idNumber: number }
}

export const getProfiles = async (): Promise<ProfileResult> => {
  const config = await loadMainConfig();
  const profileDir = config?.profileDir || '';
  const profilePaths = fs.readdirSync(profileDir).filter(path => !!Number(path));
  const data = profilePaths.map(async (path) => {
    const info = await getProfileInfo(Number(path));
    return {
      profile_id: Number(path),
      name: info.fullName,
      username: info.username,
      sex: info.sex,
      idNumber: info.idNumber,
    };
  });
  const result: ProfileResult = {};
  for (const item of await Promise.all(data)) {
    result[String(item.profile_id)] = item;
  }
  return result;
}

export interface ChangeProfileInfoParams {
  ws: string;
  id: number;
  username: string;
}
const EDIT_PROFILE_SELECTOR = 'div.x1i10hfl.xjbqb8w.x1ypdohk.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.xexx8yu.x18d9i69.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1lku1pv.x1a2a7pz.x6s0dn4.x16qb05n.xi7iut8.x1dm3dyd.x1pv694p.x9f619.x3nfvp2.x1s688f.x90ne7k.xl56j7k.x193iq5w.xf7dkkf.xv54qhq.x1g2r6go.x12w9bfk.x11xpdln.xz4gly6.x87ps6o.xuxw1ft.x19kf12q.xz6dhga.x79t38.x1qv9dbp.x121z25r.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x178xt8z.x1lun4ml.xso031l.xpilrb4.xw2npq5.x1l7klhg.x1iyjqo2.xs83m0k';
const MODAL_EDIT_PROFILE_SELECTOR = 'div.x1cy8zhl.x9f619.x78zum5.xl56j7k.x2lwn1j.xeuugli.x47corl';
const LABEL_NAME_SELECTOR = `xpath=//span[normalize-space()='Name']`;
const LABEL_USERNAME_SELECTOR = `xpath=//span[normalize-space()='Username']`;
const LABEL_BIO_SELECTOR = `xpath=//span[normalize-space()='Bio']`;
const INPUT_FILE_SELECTOR = 'input[type="file"]';
const DONE_BUTTON_SELECTOR = `div.x1i10hfl.xjbqb8w.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x972fbf.x10w94by.x1qhh985.x14e42zd.x1ypdohk.xdl72j9.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1lku1pv.x1a2a7pz.x6s0dn4.x16qb05n.xi7iut8.x1dm3dyd.x1pv694p.x9f619.x3nfvp2.x90ne7k.xl56j7k.x193iq5w.x1g2r6go.x12w9bfk.x11xpdln.xz4gly6.x87ps6o.xuxw1ft.x19kf12q.xw2npq5.x1lkfr7t.x1mznueg.x1isbhzs.xw3kv2p.xwmlgs2.x1s688f`;

export const changeProfileInfo = async ({ ws, id, username }: ChangeProfileInfoParams, event: IpcMainEvent) => {
  const profile = await getProfileInfo(id);
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto(`https://threads.com/@${username}`);
  await waitRandom(5000, 10000);

  const handleChange = async (modalEditProfile: ElementHandle<HTMLDivElement>, selector: string, content: string, isUsername = false) => {
    const label = await modalEditProfile.$(selector);
    if (!label) {
      throw new Error(`Không tìm thấy label ${selector}`);
    }
    await label.click();
    await waitRandom(2000, 3000);

    if (isUsername) {
      // tab 2 times and enter
      await page.keyboard.press('Tab');
      await waitRandom(1000, 2000);
      await page.keyboard.press('Tab');
      await waitRandom(1000, 2000);
      await page.keyboard.press('Enter');
      await waitRandom(3000, 5000);
    }

    // select textarea and type ''
    const textarea = await modalEditProfile.$('textarea');
    if (!textarea) {
      throw new Error('Không tìm thấy textarea');
    }
    await textarea.evaluate(el => {
      el.value = '';
    });
    await waitRandom(1000, 2000);

    await textarea.type(content, { delay: 100 });
    await waitRandom(1000, 2000);

    const doneButton = await page.$(DONE_BUTTON_SELECTOR);
    if (!doneButton) {
      throw new Error('Không tìm thấy nút "Done"');
    }
    await doneButton.click();
    await waitRandom(4000, 6000);
  }

  try {
    // find div with class x6ikm8r x10wlt62 xlyipyv and content = Edit profile
    const editProfile = await page.$(EDIT_PROFILE_SELECTOR);
    if (!editProfile) {
      throw new Error('Không tìm thấy nút "Edit profile"');
    }
    if (editProfile) {
      await editProfile.click();
      await waitRandom(5000, 10000);
    }

    const modalEditProfile = await page.$(MODAL_EDIT_PROFILE_SELECTOR);
    if (!modalEditProfile) {
      throw new Error('Không tìm thấy modal "Edit profile"');
    }

    await handleChange(modalEditProfile, LABEL_NAME_SELECTOR, profile.fullName);
    await handleChange(modalEditProfile, LABEL_USERNAME_SELECTOR, profile.username, true);
    await handleChange(modalEditProfile, LABEL_BIO_SELECTOR, 'Bio ne');

    // upload profile picture
    const inputFile = await page.$(INPUT_FILE_SELECTOR);
    if (!inputFile) {
      throw new Error('Không tìm thấy input file');
    }
    await inputFile.uploadFile(profile.profilePicture);
    await waitRandom(3000, 5000);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendMessage(event, { id, username, message });
  }
}



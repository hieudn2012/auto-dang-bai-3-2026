import { User, IUser } from './user.model';

export const createUser = async (data: Partial<IUser>) => {
  const user = new User(data);
  return user.save();
};

export const getAllUsers = async () => {
  return User.find();
};

export const getUserById = async (id: string) => {
  return User.findById(id);
};

export const updateUser = async (id: string, data: Partial<IUser>) => {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteUser = async (id: string) => {
  return User.findByIdAndDelete(id);
};

export interface LoginCredentials {
  mac_id: string;
}

export const login = async ({ mac_id }: LoginCredentials) => {
  const user = await User.findOne({ mac_id: mac_id.toUpperCase() });
  console.log(mac_id);
  
  if (!user) {
    throw new Error('Mac ID is not registered');
  }
  return user;
};

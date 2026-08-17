import { api } from './api';
import { TreeNode } from '../types';

export const treeService = {
  getTree: async (): Promise<TreeNode[]> => {
    const { data } = await api.get<TreeNode[]>('/tree');
    return data;
  },
};

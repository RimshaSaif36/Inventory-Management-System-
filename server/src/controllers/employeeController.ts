import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getEmployees = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const search = req.query.search?.toString();
    const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
    const pageSize = Math.min(100, parseInt(req.query.pageSize?.toString() || "50"));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      ...(storeId && { storeId }),
      ...(search && { name: { contains: search } }),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        include: { store: true },
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.employee.count({ where: whereClause }),
    ]);

    res.json({ data: employees, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error("getEmployees error:", error);
    res.status(500).json({ message: "Error retrieving employees" });
  }
};

export const getEmployeeById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!employee) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    res.json(employee);
  } catch (error) {
    console.error("getEmployeeById error:", error);
    res.status(500).json({ message: "Error retrieving employee" });
  }
};

export const createEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, storeId, position } = req.body;

    if (!name || !storeId) {
      res.status(400).json({ message: "Name and storeId are required" });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        storeId,
        position: position || null,
      },
      include: { store: true },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("createEmployee error:", error);
    res.status(500).json({ message: "Error creating employee" });
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(position !== undefined && { position }),
      },
      include: { store: true },
    });

    res.json(employee);
  } catch (error) {
    console.error("updateEmployee error:", error);
    res.status(500).json({ message: "Error updating employee" });
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id },
    });

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("deleteEmployee error:", error);
    res.status(500).json({ message: "Error deleting employee" });
  }
};

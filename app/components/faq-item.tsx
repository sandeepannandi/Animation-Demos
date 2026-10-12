"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import styles from "./faq.module.css";

export function FaqItem({
  q,
  index,
  children,
}: {
  q: string;
  index: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <motion.div
      className={styles.item}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
    >
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{q}</span>
          <motion.i
            aria-hidden="true"
            initial={false}
            animate={{ rotate: open ? -135 : 45 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </button>
      </h3>
      <motion.div
        id={id}
        role="region"
        aria-label={q}
        className={styles.panel}
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <p>{children}</p>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import styles from "./source-dropdown.module.css";

type SourceDropdownProps = {
  id: string;
  labelId: string;
  options: string[];
  value: number;
  onChange: (value: number) => void;
};

export function SourceDropdown({
  id,
  labelId,
  options,
  value,
  onChange,
}: SourceDropdownProps) {
  const listId = useId();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef({ text: "", time: 0 });

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [active, open, listId]);

  function show(index = value) {
    search.current = { text: "", time: 0 };
    setActive(index);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function choose(index: number) {
    onChange(index);
    close();
  }

  return (
    <div
      ref={root}
      className={styles.dropdown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={id}
        type="button"
        className={styles.trigger}
        aria-labelledby={`${labelId} ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            show(event.key === "Home" ? 0 : options.length - 1);
          }
        }}
      >
        <span id={`${id}-value`} className={styles.value}>{options[value]}</span>
        <ChevronDown size={15} aria-hidden="true" className={open ? styles.chevronOpen : styles.chevron} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={`${listId}-${active}`}
            className={styles.menu}
            initial={reduce ? false : { opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: "easeOut" }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((index) => (index + step + options.length) % options.length);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                setActive(event.key === "Home" ? 0 : options.length - 1);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose(active);
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              } else if (event.key === "Tab") {
                setOpen(false);
              } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                const now = Date.now();
                const text = (now - search.current.time > 700 ? "" : search.current.text) + event.key.toLowerCase();
                search.current = { text, time: now };
                const match = options.findIndex((option) => option.toLowerCase().startsWith(text));
                if (match >= 0) setActive(match);
              }
            }}
          >
            {options.map((option, index) => (
              <li
                id={`${listId}-${index}`}
                key={option}
                role="option"
                aria-selected={index === value}
                className={`${styles.option} ${index === active ? styles.active : ""}`}
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option}</span>
                {index === value && <Check size={15} aria-hidden="true" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

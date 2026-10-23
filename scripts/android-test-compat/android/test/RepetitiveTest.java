package android.test;
import java.lang.annotation.*;
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RepetitiveTest { int numIterations() default 1; }
